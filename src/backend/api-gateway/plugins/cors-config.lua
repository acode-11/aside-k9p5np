-- Kong CORS Plugin v1.0.0
-- Implements secure cross-origin resource sharing for the AI-Powered Detection Platform
-- External dependency: kong v2.8.1

local kong = require "kong"
local table_concat = table.concat
local ngx = ngx
local type = type
local ipairs = ipairs
local pairs = pairs
local error = error

-- Plugin configuration table with security-focused implementation
local plugin = {
  PRIORITY = 2000,
  VERSION = "1.0.0",
}

-- Default configuration values with strict security controls
local DEFAULT_ALLOWED_METHODS = {
  "GET",
  "POST", 
  "PUT",
  "DELETE",
  "OPTIONS"
}

-- Utility function to validate origin patterns
local function validate_origin_pattern(pattern)
  if type(pattern) ~= "string" then
    return false
  end
  
  -- Only allow https:// origins for security
  if not pattern:match("^https://") then
    return false
  end
  
  -- Validate wildcard usage
  if pattern:find("*", 1, true) then
    if not pattern:match("^https://%*%.detection%-platform%.com$") then
      return false
    end
  end
  
  return true
end

-- Utility function to validate HTTP methods
local function validate_http_method(method)
  local valid_methods = {
    GET = true,
    POST = true,
    PUT = true,
    DELETE = true,
    OPTIONS = true
  }
  return valid_methods[method] or false
end

-- Utility function to validate headers
local function validate_header(header)
  -- Allowlist of permitted headers
  local allowed_headers = {
    ["authorization"] = true,
    ["content-type"] = true,
    ["x-requested-with"] = true,
    ["x-auth-token"] = true
  }
  return allowed_headers[header:lower()] or false
end

-- Initialize plugin and validate configuration
function plugin:init()
  kong.log.debug("Initializing CORS plugin with security controls")
  
  -- Validate configuration on startup
  local ok, err = pcall(function()
    -- Verify allowed origins
    if not self.config.allowed_origins or #self.config.allowed_origins == 0 then
      error("allowed_origins must be configured")
    end
    
    for _, pattern in ipairs(self.config.allowed_origins) do
      if not validate_origin_pattern(pattern) then
        error("invalid origin pattern: " .. pattern)
      end
    end
    
    -- Verify allowed methods
    if self.config.allowed_methods then
      for _, method in ipairs(self.config.allowed_methods) do
        if not validate_http_method(method) then
          error("invalid HTTP method: " .. method)
        end
      end
    end
    
    -- Verify allowed headers
    if self.config.allowed_headers then
      for _, header in ipairs(self.config.allowed_headers) do
        if not validate_header(header) then
          error("invalid header: " .. header)
        end
      end
    end
  end)
  
  if not ok then
    kong.log.err("CORS plugin initialization failed: ", err)
    return false
  end
  
  kong.log.debug("CORS plugin initialized successfully")
  return true
end

-- Handle CORS preflight requests
function plugin:access(plugin_conf)
  -- Only process OPTIONS preflight requests
  if ngx.req.get_method() ~= "OPTIONS" then
    return
  end
  
  local origin = ngx.req.get_headers()["Origin"]
  if not origin then
    return kong.response.exit(403, { message = "Origin header required" })
  end
  
  -- Validate origin against allowed patterns
  local origin_allowed = false
  for _, pattern in ipairs(plugin_conf.allowed_origins) do
    if origin:match(pattern:gsub("%*", ".*")) then
      origin_allowed = true
      break
    end
  end
  
  if not origin_allowed then
    return kong.response.exit(403, { message = "Origin not allowed" })
  end
  
  -- Validate preflight request headers
  local request_method = ngx.req.get_headers()["Access-Control-Request-Method"]
  if not request_method or not validate_http_method(request_method) then
    return kong.response.exit(403, { message = "Invalid request method" })
  end
  
  local request_headers = ngx.req.get_headers()["Access-Control-Request-Headers"]
  if request_headers then
    for header in request_headers:gmatch("([^,]+)") do
      if not validate_header(header:match("^%s*(.-)%s*$")) then
        return kong.response.exit(403, { message = "Invalid request header" })
      end
    end
  end
  
  -- Return successful preflight response
  if not plugin_conf.preflight_continue then
    return kong.response.exit(204)
  end
end

-- Add CORS headers to responses
function plugin:header_filter(plugin_conf)
  local origin = ngx.req.get_headers()["Origin"]
  if not origin then
    return
  end
  
  -- Validate and set origin
  local origin_allowed = false
  for _, pattern in ipairs(plugin_conf.allowed_origins) do
    if origin:match(pattern:gsub("%*", ".*")) then
      origin_allowed = true
      break
    end
  end
  
  if not origin_allowed then
    return
  end
  
  -- Set CORS headers with validated values
  ngx.header["Access-Control-Allow-Origin"] = origin
  ngx.header["Access-Control-Allow-Methods"] = table_concat(
    plugin_conf.allowed_methods or DEFAULT_ALLOWED_METHODS, ", "
  )
  
  if plugin_conf.allowed_headers then
    ngx.header["Access-Control-Allow-Headers"] = table_concat(
      plugin_conf.allowed_headers, ", "
    )
  end
  
  if plugin_conf.exposed_headers then
    ngx.header["Access-Control-Expose-Headers"] = table_concat(
      plugin_conf.exposed_headers, ", "
    )
  end
  
  if plugin_conf.max_age then
    ngx.header["Access-Control-Max-Age"] = plugin_conf.max_age
  end
  
  if plugin_conf.credentials then
    ngx.header["Access-Control-Allow-Credentials"] = "true"
  end
  
  -- Add Vary header for proper caching
  ngx.header["Vary"] = "Origin"
end

-- Export plugin
return plugin