var Reflection = (function() {
    'use strict';
    
    var ReflectionException = function(message, originalError) {
        this.name = 'ReflectionException';
        this.message = message;
        this.originalError = originalError;
        this.stack = new Error().stack;
    };
    ReflectionException.prototype = Object.create(Error.prototype);
    ReflectionException.prototype.constructor = ReflectionException;
    
    var TypeChecker = {
        isFunction: function(obj) {
            return typeof obj === 'function';
        },
        isClass: function(obj) {
            return this.isFunction(obj) && /^\s*class\s+/.test(obj.toString());
        },
        isObject: function(obj) {
            return obj !== null && typeof obj === 'object';
        },
        isString: function(obj) {
            return typeof obj === 'string';
        },
        isArray: function(obj) {
            return Array.isArray(obj);
        },
        getTypeName: function(obj) {
            if (obj === null) return 'null';
            if (obj === undefined) return 'undefined';
            if (Array.isArray(obj)) return 'array';
            return typeof obj;
        }
    };
    
    var ParameterInfo = function(name, index, optional, defaultValue, typeHint) {
        this.name = name;
        this.index = index;
        this.optional = optional;
        this.defaultValue = defaultValue;
        this.typeHint = typeHint;
    };
    
    var MethodInfo = function(name, declaringClass, isStatic, isPrivate, parameters) {
        this.name = name;
        this.declaringClass = declaringClass;
        this.isStatic = isStatic;
        this.isPrivate = isPrivate;
        this.parameters = parameters || [];
    };
    
    var PropertyInfo = function(name, declaringClass, isStatic, isPrivate, value, type) {
        this.name = name;
        this.declaringClass = declaringClass;
        this.isStatic = isStatic;
        this.isPrivate = isPrivate;
        this.value = value;
        this.type = type;
    };
    
    var ReflectClass = function(classConstructor) {
        this._class = classConstructor;
        this._classInstance = null;
        this._methods = [];
        this._properties = [];
        this._initialize();
    };
    
    ReflectClass.prototype._initialize = function() {
        if (!TypeChecker.isClass(this._class) && !TypeChecker.isFunction(this._class)) {
            throw new ReflectionException('Invalid class constructor provided');
        }
        this._collectMethods();
        this._collectProperties();
    };
    
    ReflectClass.prototype._collectMethods = function() {
        this._methods = [];
        
        var proto = Object.getPrototypeOf(this._class.prototype);
        while (proto && proto !== Object.prototype) {
            this._collectMethodsFromObject(proto, false, false);
            proto = Object.getPrototypeOf(proto);
        }
        
        this._collectMethodsFromObject(this._class.prototype, false, false);
        this._collectMethodsFromObject(this._class, true, false);
    };
    
    ReflectClass.prototype._collectMethodsFromObject = function(obj, isStatic, isPrivate) {
        Object.getOwnPropertyNames(obj).forEach(function(name) {
            if (name === 'constructor' || name === '__proto__') return;
            
            var descriptor = Object.getOwnPropertyDescriptor(obj, name);
            if (descriptor && TypeChecker.isFunction(descriptor.value)) {
                var params = this._extractParameters(descriptor.value);
                var methodInfo = new MethodInfo(name, this._class, isStatic, isPrivate, params);
                this._methods.push(methodInfo);
            }
        }.bind(this));
    };
    
    ReflectClass.prototype._extractParameters = function(func) {
        var params = [];
        var funcStr = func.toString();
        var match = funcStr.match(/\(([\s\S]*?)\)/);
        if (match && match[1]) {
            var paramsStr = match[1].trim();
            if (paramsStr) {
                var paramNames = paramsStr.split(',').map(function(p) {
                    return p.trim().split('=')[0].trim();
                });
                paramNames.forEach(function(name, index) {
                    var optional = funcStr.indexOf(name + '=') !== -1;
                    var paramInfo = new ParameterInfo(name, index, optional);
                    params.push(paramInfo);
                });
            }
        }
        return params;
    };
    
    ReflectClass.prototype._collectProperties = function() {
        this._properties = [];
        
        if (this._class.prototype) {
            Object.getOwnPropertyNames(this._class.prototype).forEach(function(name) {
                if (name === 'constructor' || name === '__proto__') return;
                var descriptor = Object.getOwnPropertyDescriptor(this._class.prototype, name);
                if (descriptor && !TypeChecker.isFunction(descriptor.value)) {
                    var type = descriptor.value !== undefined ? TypeChecker.getTypeName(descriptor.value) : 'undefined';
                    var propInfo = new PropertyInfo(name, this._class, false, false, descriptor.value, type);
                    this._properties.push(propInfo);
                }
            }.bind(this));
        }
    };
    
    ReflectClass.prototype.getName = function() {
        return this._class.name || 'AnonymousClass';
    };
    
    ReflectClass.prototype.getMethods = function() {
        return this._methods.slice();
    };
    
    ReflectClass.prototype.getMethod = function(name) {
        var method = this._methods.find(function(m) {
            return m.name === name;
        });
        if (!method) {
            throw new ReflectionException('Method "' + name + '" not found');
        }
        return method;
    };
    
    ReflectClass.prototype.hasMethod = function(name) {
        return this._methods.some(function(m) {
            return m.name === name;
        });
    };
    
    ReflectClass.prototype.getProperties = function() {
        return this._properties.slice();
    };
    
    ReflectClass.prototype.getProperty = function(name) {
        var prop = this._properties.find(function(p) {
            return p.name === name;
        });
        if (!prop) {
            throw new ReflectionException('Property "' + name + '" not found');
        }
        return prop;
    };
    
    ReflectClass.prototype.hasProperty = function(name) {
        return this._properties.some(function(p) {
            return p.name === name;
        });
    };
    
    ReflectClass.prototype.getConstructor = function() {
        return this._class;
    };
    
    ReflectClass.prototype.newInstance = function() {
        try {
            var args = Array.prototype.slice.call(arguments);
            var instance = Object.create(this._class.prototype);
            var result = this._class.apply(instance, args);
            return TypeChecker.isObject(result) ? result : instance;
        } catch (e) {
            throw new ReflectionException('Failed to create instance: ' + e.message, e);
        }
    };
    
    var ReflectObject = function(instance) {
        this._instance = instance;
        this._reflectClass = new ReflectClass(instance.constructor);
    };
    
    ReflectObject.prototype.getClass = function() {
        return this._reflectClass;
    };
    
    ReflectObject.prototype.getInstance = function() {
        return this._instance;
    };
    
    ReflectObject.prototype.getProperty = function(name) {
        try {
            return this._instance[name];
        } catch (e) {
            throw new ReflectionException('Failed to get property "' + name + '": ' + e.message, e);
        }
    };
    
    ReflectObject.prototype.setProperty = function(name, value) {
        try {
            this._instance[name] = value;
            return this;
        } catch (e) {
            throw new ReflectionException('Failed to set property "' + name + '": ' + e.message, e);
        }
    };
    
    ReflectObject.prototype.invokeMethod = function(name) {
        try {
            var args = Array.prototype.slice.call(arguments, 1);
            var method = this._instance[name];
            if (!TypeChecker.isFunction(method)) {
                throw new ReflectionException('Method "' + name + '" is not a function');
            }
            return method.apply(this._instance, args);
        } catch (e) {
            if (e instanceof ReflectionException) throw e;
            throw new ReflectionException('Failed to invoke method "' + name + '": ' + e.message, e);
        }
    };
    
    ReflectObject.prototype.getMethods = function() {
        return this._reflectClass.getMethods();
    };
    
    ReflectObject.prototype.getProperties = function() {
        var props = [];
        for (var key in this._instance) {
            if (Object.prototype.hasOwnProperty.call(this._instance, key)) {
                var value = this._instance[key];
                var type = TypeChecker.getTypeName(value);
                var propInfo = new PropertyInfo(key, this._instance.constructor, false, false, value, type);
                props.push(propInfo);
            }
        }
        return props;
    };
    
    var Reflect = {
        ReflectClass: ReflectClass,
        ReflectObject: ReflectObject,
        ReflectionException: ReflectionException,
        
        forClass: function(classConstructor) {
            return new ReflectClass(classConstructor);
        },
        
        forInstance: function(instance) {
            return new ReflectObject(instance);
        },
        
        create: function(classConstructor) {
            var args = Array.prototype.slice.call(arguments, 1);
            var reflectClass = new ReflectClass(classConstructor);
            return reflectClass.newInstance.apply(reflectClass, args);
        },
        
        getClass: function(instance) {
            return new ReflectClass(instance.constructor);
        },
        
        getMethod: function(obj, name) {
            if (TypeChecker.isFunction(obj)) {
                var reflectClass = new ReflectClass(obj);
                return reflectClass.getMethod(name);
            } else {
                var reflectObj = new ReflectObject(obj);
                return reflectObj.getClass().getMethod(name);
            }
        },
        
        invokeMethod: function(obj, name) {
            var args = Array.prototype.slice.call(arguments, 2);
            var reflectObj = new ReflectObject(obj);
            return reflectObj.invokeMethod.apply(reflectObj, [name].concat(args));
        },
        
        getProperty: function(obj, name) {
            var reflectObj = new ReflectObject(obj);
            return reflectObj.getProperty(name);
        },
        
        setProperty: function(obj, name, value) {
            var reflectObj = new ReflectObject(obj);
            return reflectObj.setProperty(name, value);
        },
        
        isInstanceOf: function(obj, classConstructor) {
            return obj instanceof classConstructor;
        },
        
        getType: function(obj) {
            return TypeChecker.getTypeName(obj);
        },
        
        getTypeName: TypeChecker.getTypeName,
        TypeChecker: TypeChecker
    };
    
    return Reflect;
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Reflection;
}