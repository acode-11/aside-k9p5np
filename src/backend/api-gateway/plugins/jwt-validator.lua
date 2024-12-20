-- jwt-validator.lua
-- Kong plugin for JWT validation and RBAC
-- Version: 1.0.0
-- Dependencies:
-- kong v2.8.1
-- lua-resty-jwt v0.2.3

local kong = require "kong"
local jwt = require "resty.jwt"
local cjson = require "cjson.safe"

-- Plugin constants
local PLUGIN_NAME = "jwt-validator"
local PLUGIN_VERSION = "1.0.0"
local PLUGIN_PRIORITY = 1000

-- Initialize shared token cache
local token_cache = ngx.shared.jwt_tokens

-- Plugin schema definition
local schema = {
    name = PLUGIN_NAME,
    fields = {
        algorithm = { type = "string", default = "RS256", required = true },
        valid_issuers = { type = "array", elements = "string", required = true },
        valid_audiences = { type = "array", elements = "string", required = true },
        claims_to_verify = { 
            type = "array", 
            elements = "string", 
            default = {"exp", "nbf", "iss", "sub", "aud"} 
        },
        roles_claim = { type = "string", default = "roles", required = true },
        required_roles = { 
            type = "map", 
            keys = "string", 
            values = "array", 
            required = true 
        },
        anonymous = { 
            type = "map", 
            keys = "string", 
            values = "boolean", 
            required = false 
        },
        cache_ttl = { type = "number", default = 300, required = false },
        role_hierarchy = { 
            type = "map", 
            keys = "string", 
            values = "array", 
            required = false 
        },
        monitoring = { 
            type = "map", 
            keys = "string", 
            values = "boolean", 
            required = false 
        }
    }
}

-- Helper function to validate token format
local function validate_token_format(token)
    if not token then
        return nil, "missing token"
    end
    
    local parts = {}
    for part in token:gmatch("[^%.]+") do
        table.insert(parts, part)
    end
    
    if #parts ~= 3 then
        return nil, "invalid token format"
    end
    
    return true
end

-- Helper function to check role hierarchy
local function check_role_hierarchy(role, required_role, hierarchy)
    if role == required_role then
        return true
    end
    
    if hierarchy and hierarchy[role] then
        for _, inherited_role in ipairs(hierarchy[role]) do
            if inherited_role == required_role or 
               (hierarchy[inherited_role] and check_role_hierarchy(inherited_role, required_role, hierarchy)) then
                return true
            end
        end
    end
    
    return false
end

-- Main plugin handler
local JWTValidatorHandler = {
    PRIORITY = PLUGIN_PRIORITY,
    VERSION = PLUGIN_VERSION
}

-- Create new instance of the plugin
function JWTValidatorHandler:new()
    local instance = {
        -- Initialize monitoring metrics
        metrics = {
            validation_count = 0,
            cache_hits = 0,
            validation_errors = 0,
            role_validation_errors = 0
        }
    }
    return setmetatable(instance, { __index = self })
end

-- Validate JWT token
function JWTValidatorHandler:validate_token(token, conf)
    -- Check cache first
    local cached_validation = token_cache:get(token)
    if cached_validation then
        self.metrics.cache_hits = self.metrics.cache_hits + 1
        return cjson.decode(cached_validation)
    end
    
    -- Validate token format
    local ok, err = validate_token_format(token)
    if not ok then
        return nil, err
    end
    
    -- Decode and validate JWT
    local jwt_obj = jwt:verify(conf.jwt_secret, token, {
        algorithm = conf.algorithm,
        valid_issuers = conf.valid_issuers,
        valid_audiences = conf.valid_audiences
    })
    
    if not jwt_obj.verified then
        self.metrics.validation_errors = self.metrics.validation_errors + 1
        return nil, jwt_obj.reason
    end
    
    -- Validate required claims
    for _, claim in ipairs(conf.claims_to_verify) do
        if not jwt_obj.payload[claim] then
            return nil, "missing required claim: " .. claim
        end
    end
    
    -- Cache successful validation
    if conf.cache_ttl > 0 then
        token_cache:set(token, cjson.encode(jwt_obj.payload), conf.cache_ttl)
    end
    
    return jwt_obj.payload
end

-- Check roles against requirements
function JWTValidatorHandler:check_roles(token_roles, required_roles, hierarchy)
    if not token_roles then
        return false, "no roles found in token"
    end
    
    for _, required_role in ipairs(required_roles) do
        local role_found = false
        for _, token_role in ipairs(token_roles) do
            if check_role_hierarchy(token_role, required_role, hierarchy) then
                role_found = true
                break
            end
        end
        
        if not role_found then
            self.metrics.role_validation_errors = self.metrics.role_validation_errors + 1
            return false, "missing required role: " .. required_role
        end
    end
    
    return true
end

-- Main access function
function JWTValidatorHandler:access(conf)
    -- Generate request ID for tracking
    local request_id = kong.request.get_header("X-Request-ID") or kong.tools.uuid()
    kong.service.request.set_header("X-Request-ID", request_id)
    
    -- Check for anonymous access
    local path = kong.request.get_path()
    if conf.anonymous and conf.anonymous[path] then
        return
    end
    
    -- Extract token from headers
    local auth_header = kong.request.get_header("Authorization")
    if not auth_header then
        return kong.response.exit(401, { 
            message = "missing authorization header",
            request_id = request_id 
        })
    end
    
    local _, _, token = string.find(auth_header, "Bearer%s+(.+)")
    if not token then
        return kong.response.exit(401, { 
            message = "invalid authorization header format",
            request_id = request_id 
        })
    end
    
    -- Validate token
    local payload, err = self:validate_token(token, conf)
    if not payload then
        return kong.response.exit(401, { 
            message = "token validation failed: " .. err,
            request_id = request_id 
        })
    end
    
    -- Check roles
    local token_roles = payload[conf.roles_claim]
    local required_roles = conf.required_roles[kong.request.get_method() .. ":" .. path]
    
    if required_roles then
        local has_roles, err = self:check_roles(token_roles, required_roles, conf.role_hierarchy)
        if not has_roles then
            return kong.response.exit(403, { 
                message = "insufficient permissions: " .. err,
                request_id = request_id 
            })
        end
    end
    
    -- Set headers for downstream services
    kong.service.request.set_header("X-Consumer-ID", payload.sub)
    kong.service.request.set_header("X-Consumer-Roles", table.concat(token_roles, ","))
    
    -- Update metrics
    self.metrics.validation_count = self.metrics.validation_count + 1
end

-- Export plugin
return {
    name = PLUGIN_NAME,
    schema = schema,
    handler = JWTValidatorHandler
}