-- Rate Limiting Plugin v1.0.0
-- Redis-based distributed rate limiting with sliding window algorithm
-- Dependencies:
-- kong v2.8.1
-- resty.redis v0.29

local kong = require "kong"
local redis = require "resty.redis"

-- Plugin constants
local PLUGIN_NAME = "rate-limiting"
local PLUGIN_VERSION = "1.0.0"
local PLUGIN_PRIORITY = 900

-- Redis connection pool settings
local POOL_SIZE = 100
local POOL_IDLE_TIMEOUT = 10000
local POOL_CONNECTION_LIFETIME = 60000

-- Default route limits (requests per hour)
local DEFAULT_ROUTE_LIMITS = {
    ["search"] = 1000,
    ["detection"] = 500,
    ["platform"] = 100,
    ["analytics"] = 200,
    ["community"] = 300
}

-- Error messages
local ERRORS = {
    REDIS_CONNECTION = "Failed to connect to Redis",
    REDIS_COMMAND = "Redis command failed",
    INVALID_IDENTIFIER = "Invalid rate limit identifier",
    LIMIT_EXCEEDED = "Rate limit exceeded"
}

-- Plugin schema definition
local schema = {
    name = PLUGIN_NAME,
    fields = {
        redis_host = { type = "string", required = true },
        redis_port = { type = "number", default = 6379, required = true },
        redis_timeout = { type = "number", default = 2000, required = true },
        redis_database = { type = "number", default = 0 },
        window_size = { type = "number", default = 3600 },
        limit_by = { type = "string", default = "consumer" },
        fallback_to_ip = { type = "boolean", default = true },
        sync_rate = { type = "number", default = 10 },
        route_limits = { 
            type = "map",
            keys = { type = "string" },
            values = { type = "number" },
            required = true
        }
    }
}

-- Helper function to get Redis connection from pool
local function get_redis_connection(conf)
    local red = redis:new()
    red:set_timeout(conf.redis_timeout)

    local ok, err = red:connect(conf.redis_host, conf.redis_port)
    if not ok then
        kong.log.err(ERRORS.REDIS_CONNECTION .. ": " .. err)
        return nil, err
    end

    if conf.redis_database ~= 0 then
        local ok, err = red:select(conf.redis_database)
        if not ok then
            kong.log.err("Failed to select Redis database: " .. err)
            return nil, err
        end
    end

    return red
end

-- Helper function to safely release Redis connection
local function release_redis_connection(red)
    if red then
        local ok, err = red:set_keepalive(
            POOL_IDLE_TIMEOUT,
            POOL_SIZE
        )
        if not ok then
            kong.log.err("Failed to release Redis connection: " .. err)
        end
    end
end

-- Get unique identifier for rate limiting
local function get_identifier(conf)
    local identifier

    -- Check for authenticated consumer
    local consumer = kong.client.get_consumer()
    if consumer then
        identifier = consumer.id
    end

    -- Check for API key if no consumer
    if not identifier then
        local api_key = kong.request.get_header("apikey")
        if api_key then
            identifier = "key:" .. api_key
        end
    end

    -- Fallback to IP if configured
    if not identifier and conf.fallback_to_ip then
        identifier = "ip:" .. kong.client.get_forwarded_ip()
    end

    if not identifier then
        return nil, ERRORS.INVALID_IDENTIFIER
    end

    return identifier
end

-- Increment rate limit counter with sliding window
local function increment_counter(red, identifier, window_size, limit)
    local current_time = ngx.time()
    local window_key = string.format("ratelimit:%s:%d", identifier, current_time - (current_time % window_size))
    
    -- Multi-command transaction for atomic increment
    red:init_pipeline()
    red:incr(window_key)
    red:expire(window_key, window_size * 2)
    
    local responses, err = red:commit_pipeline()
    if not responses then
        return nil, ERRORS.REDIS_COMMAND .. ": " .. err
    end
    
    local current_count = responses[1]
    
    -- Check previous window for sliding window calculation
    local previous_key = string.format("ratelimit:%s:%d", identifier, current_time - window_size - (current_time % window_size))
    local previous_count = red:get(previous_key) or 0
    
    -- Calculate sliding window count
    local sliding_count = math.floor(previous_count * ((window_size - (current_time % window_size)) / window_size) + current_count)
    
    return sliding_count, current_count
end

-- Set rate limit headers
local function set_headers(limit, remaining, window_size)
    kong.response.set_header("X-RateLimit-Limit", limit)
    kong.response.set_header("X-RateLimit-Remaining", math.max(0, limit - remaining))
    kong.response.set_header("X-RateLimit-Reset", window_size - (ngx.time() % window_size))
end

-- Plugin handler
local RateLimitingHandler = {
    PRIORITY = PLUGIN_PRIORITY,
    VERSION = PLUGIN_VERSION
}

-- Plugin initialization
function RateLimitingHandler:new()
    self._name = PLUGIN_NAME
    return self
end

-- Main plugin logic
function RateLimitingHandler:access(conf)
    -- Get identifier for rate limiting
    local identifier, err = get_identifier(conf)
    if not identifier then
        kong.log.err(err)
        return kong.response.exit(403, { message = err })
    end

    -- Get Redis connection
    local red, err = get_redis_connection(conf)
    if not red then
        return kong.response.exit(500, { message = err })
    end

    -- Get route-specific limit
    local route = kong.router.get_route()
    local route_name = route and route.name or "default"
    local limit = conf.route_limits[route_name] or DEFAULT_ROUTE_LIMITS[route_name] or 1000

    -- Increment and check rate limit
    local count, current = increment_counter(red, identifier, conf.window_size, limit)
    
    -- Release Redis connection
    release_redis_connection(red)

    if not count then
        return kong.response.exit(500, { message = current })
    end

    -- Set rate limit headers
    set_headers(limit, count, conf.window_size)

    -- Check if limit exceeded
    if count > limit then
        return kong.response.exit(429, {
            message = ERRORS.LIMIT_EXCEEDED,
            limit = limit,
            window_size = conf.window_size
        }, {
            ["Retry-After"] = conf.window_size - (ngx.time() % conf.window_size)
        })
    end
end

return RateLimitingHandler