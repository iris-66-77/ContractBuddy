# Reflection (反射) 机制使用文档

## 概述

Reflection 是一个 JavaScript 反射机制库，提供了在运行时动态获取类元数据、动态创建对象、调用方法和访问属性的能力。它具有类型安全、异常处理完善、易于使用的特点。

## 特性

- **类元数据获取**：获取构造函数信息、方法列表、属性列表及其类型信息
- **动态对象创建**：通过类名或对象实例动态创建对象
- **方法动态调用**：支持传递参数和处理返回值的方法调用
- **属性动态访问/修改**：在运行时访问或修改对象属性值
- **类型安全**：内置类型检查机制，确保操作的安全性
- **异常处理**：完善的异常处理机制，提供友好的错误信息
- **单元测试**：提供完整的测试覆盖，验证功能的正确性

## 安装

直接引入模块即可使用：

```javascript
var Reflection = require('./reflection');
```

## 快速开始

### 1. 基础使用示例

```javascript
var Reflection = require('./reflection');

function Person(name) {
    this.name = name;
}

Person.prototype.sayHello = function() {
    return 'Hello, ' + this.name;
};

var person = Reflection.create(Person, '张三');
var result = Reflection.invokeMethod(person, 'sayHello');
console.log(result); // 输出: Hello, 张三
```

## API 文档

### 主要 API

#### Reflection.forClass(classConstructor)
获取类的反射对象。

**参数：**
- `classConstructor` (Function) - 类构造函数

**返回值：** `ReflectClass` 实例

**示例：**
```javascript
var reflectClass = Reflection.forClass(Person);
```

#### Reflection.forInstance(instance)
获取对象实例的反射对象。

**参数：**
- `instance` (Object) - 类实例

**返回值：** `ReflectObject` 实例

**示例：**
```javascript
var person = new Person('张三');
var reflectObj = Reflection.forInstance(person);
```

#### Reflection.create(classConstructor, ...args)
动态创建对象实例。

**参数：**
- `classConstructor` (Function) - 类构造函数
- `...args` (any) - 传递给构造函数的参数

**返回值：** 新创建的对象实例

**示例：**
```javascript
var person = Reflection.create(Person, '张三', 25);
```

#### Reflection.invokeMethod(obj, methodName, ...args)
动态调用对象方法。

**参数：**
- `obj` (Object) - 目标对象
- `methodName` (String) - 方法名称
- `...args` (any) - 方法参数

**返回值：** 方法调用结果

**示例：**
```javascript
var result = Reflection.invokeMethod(person, 'sayHello');
var greetResult = Reflection.invokeMethod(person, 'greet', '李四');
```

#### Reflection.getProperty(obj, propName)
获取对象属性值。

**参数：**
- `obj` (Object) - 目标对象
- `propName` (String) - 属性名称

**返回值：** 属性值

**示例：**
```javascript
var name = Reflection.getProperty(person, 'name');
```

#### Reflection.setProperty(obj, propName, value)
设置对象属性值。

**参数：**
- `obj` (Object) - 目标对象
- `propName` (String) - 属性名称
- `value` (any) - 要设置的值

**返回值：** 目标对象（支持链式调用）

**示例：**
```javascript
Reflection.setProperty(person, 'name', '李四');
```

#### Reflection.isInstanceOf(obj, classConstructor)
检查对象是否是特定类的实例。

**参数：**
- `obj` (Object) - 目标对象
- `classConstructor` (Function) - 类构造函数

**返回值：** Boolean

**示例：**
```javascript
var isPerson = Reflection.isInstanceOf(person, Person);
```

#### Reflection.getType(obj)
获取对象的类型名称。

**参数：**
- `obj` (any) - 目标对象

**返回值：** String - 类型名称

**示例：**
```javascript
var type = Reflection.getType(person); // 'object'
```

### ReflectClass API

#### ReflectClass.getName()
获取类名。

**返回值：** String

**示例：**
```javascript
var className = reflectClass.getName();
```

#### ReflectClass.getMethods()
获取类的所有方法列表。

**返回值：** Array\<MethodInfo\>

**示例：**
```javascript
var methods = reflectClass.getMethods();
methods.forEach(function(method) {
    console.log('方法:', method.name);
    console.log('参数:', method.parameters);
});
```

#### ReflectClass.getMethod(name)
获取指定方法的信息。

**参数：**
- `name` (String) - 方法名称

**返回值：** MethodInfo

**示例：**
```javascript
var method = reflectClass.getMethod('sayHello');
```

#### ReflectClass.hasMethod(name)
检查类是否有指定方法。

**参数：**
- `name` (String) - 方法名称

**返回值：** Boolean

**示例：**
```javascript
var hasMethod = reflectClass.hasMethod('sayHello');
```

#### ReflectClass.getConstructor()
获取类构造函数。

**返回值：** Function

**示例：**
```javascript
var constructor = reflectClass.getConstructor();
```

#### ReflectClass.newInstance(...args)
通过类反射创建对象实例。

**参数：**
- `...args` (any) - 构造函数参数

**返回值：** 新创建的对象实例

**示例：**
```javascript
var instance = reflectClass.newInstance('张三', 25);
```

### ReflectObject API

#### ReflectObject.getClass()
获取实例的类反射。

**返回值：** ReflectClass

**示例：**
```javascript
var reflectClass = reflectObj.getClass();
```

#### ReflectObject.getInstance()
获取原始对象实例。

**返回值：** Object

**示例：**
```javascript
var instance = reflectObj.getInstance();
```

#### ReflectObject.getProperty(name)
获取实例属性值。

**参数：**
- `name` (String) - 属性名称

**返回值：** 属性值

**示例：**
```javascript
var value = reflectObj.getProperty('name');
```

#### ReflectObject.setProperty(name, value)
设置实例属性值。

**参数：**
- `name` (String) - 属性名称
- `value` (any) - 属性值

**返回值：** ReflectObject（支持链式调用）

**示例：**
```javascript
reflectObj.setProperty('name', '李四');
```

#### ReflectObject.invokeMethod(name, ...args)
调用实例方法。

**参数：**
- `name` (String) - 方法名称
- `...args` (any) - 方法参数

**返回值：** 方法调用结果

**示例：**
```javascript
var result = reflectObj.invokeMethod('sayHello');
```

#### ReflectObject.getMethods()
获取实例的所有方法列表。

**返回值：** Array\<MethodInfo\>

**示例：**
```javascript
var methods = reflectObj.getMethods();
```

#### ReflectObject.getProperties()
获取实例的所有属性列表。

**返回值：** Array\<PropertyInfo\>

**示例：**
```javascript
var props = reflectObj.getProperties();
props.forEach(function(prop) {
    console.log(prop.name + ' (' + prop.type + '):', prop.value);
});
```

## 数据结构

### MethodInfo
方法信息对象。

**属性：**
- `name` (String) - 方法名称
- `declaringClass` (Function) - 声明类
- `isStatic` (Boolean) - 是否静态方法
- `isPrivate` (Boolean) - 是否私有方法
- `parameters` (Array\<ParameterInfo\>) - 参数列表

### ParameterInfo
参数信息对象。

**属性：**
- `name` (String) - 参数名称
- `index` (Number) - 参数索引
- `optional` (Boolean) - 是否可选参数
- `defaultValue` (any) - 默认值
- `typeHint` (String) - 类型提示

### PropertyInfo
属性信息对象。

**属性：**
- `name` (String) - 属性名称
- `declaringClass` (Function) - 声明类
- `isStatic` (Boolean) - 是否静态属性
- `isPrivate` (Boolean) - 是否私有属性
- `value` (any) - 属性值
- `type` (String) - 属性类型

## 异常处理

### ReflectionException
反射操作异常。

**属性：**
- `name` (String) - 异常名称：'ReflectionException'
- `message` (String) - 错误消息
- `originalError` (Error) - 原始错误
- `stack` (String) - 堆栈信息

**示例：**
```javascript
try {
    Reflection.invokeMethod(obj, 'nonExistentMethod');
} catch (e) {
    if (e instanceof Reflection.ReflectionException) {
        console.error('反射异常:', e.message);
    }
}
```

## 完整示例

### 示例1：类信息获取
```javascript
function Person(name, age) {
    this.name = name;
    this.age = age;
}

Person.prototype.sayHello = function() {
    return 'Hello, ' + this.name;
};

Person.prototype.greet = function(otherName) {
    return 'Hello ' + otherName + ', I am ' + this.name;
};

var reflectClass = Reflection.forClass(Person);
console.log('类名:', reflectClass.getName());
console.log('方法数量:', reflectClass.getMethods().length);
```

### 示例2：动态创建对象和调用方法
```javascript
var person = Reflection.create(Person, '张三', 25);
var reflectObj = Reflection.forInstance(person);

console.log('调用方法结果:', reflectObj.invokeMethod('sayHello'));
console.log('调用带参数方法:', reflectObj.invokeMethod('greet', '李四'));
```

### 示例3：属性操作
```javascript
console.log('获取属性:', reflectObj.getProperty('name'));
reflectObj.setProperty('name', '王五');
console.log('修改后的属性:', reflectObj.getProperty('name'));

var allProps = reflectObj.getProperties();
allProps.forEach(function(prop) {
    console.log(prop.name + ':', prop.value);
});
```

### 示例4：综合应用 - 合同分析系统
```javascript
function Contract(parties, terms) {
    this.parties = parties;
    this.terms = terms;
    this.signed = false;
}

Contract.prototype.sign = function() {
    this.signed = true;
    return this;
};

Contract.prototype.validate = function() {
    return this.parties.length === 2 && this.terms.length > 0;
};

var contract = Reflection.create(Contract, ['甲方', '乙方'], ['条款1', '条款2']);
var reflectContract = Reflection.forInstance(contract);

reflectContract.invokeMethod('sign');
var isValid = reflectContract.invokeMethod('validate');
console.log('合同验证结果:', isValid);
```

## 单元测试

运行单元测试：

```bash
node reflection-test.js
```

## 类型安全检查

### TypeChecker API

```javascript
// 检查是否是函数
Reflection.TypeChecker.isFunction(someObj);

// 检查是否是类
Reflection.TypeChecker.isClass(someObj);

// 检查是否是对象
Reflection.TypeChecker.isObject(someObj);

// 检查是否是字符串
Reflection.TypeChecker.isString(someObj);

// 检查是否是数组
Reflection.TypeChecker.isArray(someObj);

// 获取类型名称
Reflection.TypeChecker.getTypeName(someObj);
```

## 最佳实践

1. **错误处理**：始终使用 try-catch 捕获反射操作可能抛出的异常
2. **类型检查**：在执行反射操作前，使用 TypeChecker 进行类型验证
3. **参数验证**：动态调用方法前，验证参数的类型和数量
4. **性能优化**：频繁使用的反射对象可以缓存，避免重复创建
5. **文档维护**：保持类和方法的文档注释，方便元数据解析

## 进阶应用

### 动态代理
```javascript
function createProxy(target) {
    var reflectObj = Reflection.forInstance(target);
    var proxy = {};
    
    reflectObj.getMethods().forEach(function(method) {
        proxy[method.name] = function() {
            console.log('调用方法:', method.name);
            return reflectObj.invokeMethod(method.name, ...arguments);
        };
    });
    
    return proxy;
}
```

### 对象克隆
```javascript
function cloneObject(source) {
    var reflectSource = Reflection.forInstance(source);
    var reflectClass = reflectSource.getClass();
    var clone = reflectClass.newInstance();
    var reflectClone = Reflection.forInstance(clone);
    
    reflectSource.getProperties().forEach(function(prop) {
        reflectClone.setProperty(prop.name, prop.value);
    });
    
    return clone;
}
```

### 依赖注入容器
```javascript
function DIContainer() {
    this.services = {};
}

DIContainer.prototype.register = function(name, constructor) {
    this.services[name] = constructor;
};

DIContainer.prototype.resolve = function(name) {
    var constructor = this.services[name];
    return Reflection.create(constructor);
};
```

## 更新日志

### v1.0.0 (2026-06-04)
- 初始版本发布
- 实现基本的反射功能
- 添加单元测试和使用示例
- 完善异常处理机制

## 许可证

本项目属于 ContractBuddy 系统的一部分。

## 支持与反馈

如有问题或建议，请联系项目维护者。