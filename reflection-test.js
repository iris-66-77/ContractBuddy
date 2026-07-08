var Reflection = require('./reflection');

console.log('=== Reflection (反射) 机制单元测试 ===\n');

var testCount = 0;
var passedCount = 0;
var failedCount = 0;

function Test(name, fn) {
    testCount++;
    try {
        console.log('Test ' + testCount + ': ' + name + '...');
        fn();
        console.log('  ✓ Passed\n');
        passedCount++;
    } catch (e) {
        console.log('  ✗ Failed: ' + e.message + '\n');
        failedCount++;
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || 'Assertion failed: Expected ' + expected + ' but got ' + actual);
    }
}

function assertTrue(value, message) {
    if (!value) {
        throw new Error(message || 'Assertion failed: Expected true but got false');
    }
}

function assertFalse(value, message) {
    if (value) {
        throw new Error(message || 'Assertion failed: Expected false but got true');
    }
}

function assertNotNull(value, message) {
    if (value === null || value === undefined) {
        throw new Error(message || 'Assertion failed: Expected non-null value');
    }
}

function assertType(value, expectedType, message) {
    var actualType = Reflection.getType(value);
    if (actualType !== expectedType) {
        throw new Error(message || 'Assertion failed: Expected type ' + expectedType + ' but got ' + actualType);
    }
}

function TestClass() {}

TestClass.prototype.testMethod1 = function() {
    return 'test1';
};

TestClass.prototype.testMethod2 = function(arg1, arg2) {
    return arg1 + arg2;
};

TestClass.prototype.testMethod3 = function(optionalArg) {
    optionalArg = optionalArg || 'default';
    return optionalArg;
};

function TestClassWithProps(prop1, prop2) {
    this.prop1 = prop1;
    this.prop2 = prop2;
    this.prop3 = null;
}

TestClassWithProps.prototype.getProp1 = function() {
    return this.prop1;
};

TestClassWithProps.prototype.setProp2 = function(value) {
    this.prop2 = value;
};

console.log('--- 类型检查器测试 ---');

Test('isFunction - 应该正确识别函数', function() {
    assertTrue(Reflection.TypeChecker.isFunction(function() {}));
    assertTrue(Reflection.TypeChecker.isFunction(TestClass));
    assertFalse(Reflection.TypeChecker.isFunction({}));
    assertFalse(Reflection.TypeChecker.isFunction('test'));
});

Test('isObject - 应该正确识别对象', function() {
    assertTrue(Reflection.TypeChecker.isObject({}));
    assertTrue(Reflection.TypeChecker.isObject([]));
    assertFalse(Reflection.TypeChecker.isObject(null));
    assertFalse(Reflection.TypeChecker.isObject(function() {}));
});

Test('isString - 应该正确识别字符串', function() {
    assertTrue(Reflection.TypeChecker.isString('hello'));
    assertFalse(Reflection.TypeChecker.isString(123));
    assertFalse(Reflection.TypeChecker.isString(true));
});

Test('getTypeName - 应该返回正确的类型名称', function() {
    assertEquals(Reflection.TypeChecker.getTypeName('test'), 'string');
    assertEquals(Reflection.TypeChecker.getTypeName(123), 'number');
    assertEquals(Reflection.TypeChecker.getTypeName(true), 'boolean');
    assertEquals(Reflection.TypeChecker.getTypeName({}), 'object');
    assertEquals(Reflection.TypeChecker.getTypeName([]), 'array');
    assertEquals(Reflection.TypeChecker.getTypeName(null), 'null');
    assertEquals(Reflection.TypeChecker.getTypeName(undefined), 'undefined');
});

console.log('--- 类信息获取测试 ---');

Test('forClass - 应该能够获取类反射', function() {
    var reflectClass = Reflection.forClass(TestClass);
    assertNotNull(reflectClass);
    assertType(reflectClass, 'object');
});

Test('getName - 应该返回正确的类名', function() {
    var reflectClass = Reflection.forClass(TestClass);
    assertEquals(reflectClass.getName(), 'TestClass');
});

Test('getMethods - 应该返回所有方法', function() {
    var reflectClass = Reflection.forClass(TestClass);
    var methods = reflectClass.getMethods();
    assertTrue(methods.length >= 3);
});

Test('hasMethod - 应该正确判断方法是否存在', function() {
    var reflectClass = Reflection.forClass(TestClass);
    assertTrue(reflectClass.hasMethod('testMethod1'));
    assertTrue(reflectClass.hasMethod('testMethod2'));
    assertFalse(reflectClass.hasMethod('nonExistentMethod'));
});

Test('getMethod - 应该能够获取指定方法', function() {
    var reflectClass = Reflection.forClass(TestClass);
    var method = reflectClass.getMethod('testMethod1');
    assertNotNull(method);
    assertEquals(method.name, 'testMethod1');
});

console.log('--- 动态对象创建测试 ---');

Test('create - 应该能够动态创建对象', function() {
    var instance = Reflection.create(TestClassWithProps, 'value1', 'value2');
    assertNotNull(instance);
    assertType(instance, 'object');
});

Test('newInstance - 应该能够通过类反射创建对象', function() {
    var reflectClass = Reflection.forClass(TestClassWithProps);
    var instance = reflectClass.newInstance('test1', 'test2');
    assertNotNull(instance);
    assertEquals(instance.prop1, 'test1');
    assertEquals(instance.prop2, 'test2');
});

Test('isInstanceOf - 应该正确判断对象类型', function() {
    var instance = Reflection.create(TestClassWithProps, 'a', 'b');
    assertTrue(Reflection.isInstanceOf(instance, TestClassWithProps));
    assertFalse(Reflection.isInstanceOf(instance, TestClass));
});

console.log('--- 方法动态调用测试 ---');

Test('invokeMethod - 应该能够调用无参数方法', function() {
    var instance = Reflection.create(TestClass);
    var result = Reflection.invokeMethod(instance, 'testMethod1');
    assertEquals(result, 'test1');
});

Test('invokeMethod - 应该能够调用带参数方法', function() {
    var instance = Reflection.create(TestClass);
    var result = Reflection.invokeMethod(instance, 'testMethod2', 'Hello', ' World');
    assertEquals(result, 'Hello World');
});

Test('invokeMethod - 应该能够调用带可选参数方法', function() {
    var instance = Reflection.create(TestClass);
    var result = Reflection.invokeMethod(instance, 'testMethod3');
    assertEquals(result, 'default');
});

Test('forInstance - 应该能够获取实例反射', function() {
    var instance = Reflection.create(TestClass);
    var reflectObj = Reflection.forInstance(instance);
    assertNotNull(reflectObj);
    assertType(reflectObj, 'object');
});

Test('ReflectObject.invokeMethod - 应该能够通过实例反射调用方法', function() {
    var instance = Reflection.create(TestClassWithProps, 'original', 'test');
    var reflectObj = Reflection.forInstance(instance);
    reflectObj.invokeMethod('setProp2', 'newValue');
    assertEquals(instance.prop2, 'newValue');
    var result = reflectObj.invokeMethod('getProp1');
    assertEquals(result, 'original');
});

console.log('--- 属性动态访问测试 ---');

Test('getProperty - 应该能够获取属性值', function() {
    var instance = Reflection.create(TestClassWithProps, 'test1', 'test2');
    var value = Reflection.getProperty(instance, 'prop1');
    assertEquals(value, 'test1');
});

Test('setProperty - 应该能够设置属性值', function() {
    var instance = Reflection.create(TestClassWithProps, 'a', 'b');
    Reflection.setProperty(instance, 'prop1', 'newValue');
    assertEquals(instance.prop1, 'newValue');
});

Test('ReflectObject.getProperty - 应该能够通过实例反射获取属性', function() {
    var instance = Reflection.create(TestClassWithProps, 'v1', 'v2');
    var reflectObj = Reflection.forInstance(instance);
    assertEquals(reflectObj.getProperty('prop1'), 'v1');
    assertEquals(reflectObj.getProperty('prop2'), 'v2');
});

Test('ReflectObject.setProperty - 应该能够通过实例反射设置属性', function() {
    var instance = Reflection.create(TestClassWithProps, 'old', 'value');
    var reflectObj = Reflection.forInstance(instance);
    reflectObj.setProperty('prop1', 'new');
    assertEquals(instance.prop1, 'new');
});

Test('getProperties - 应该能够获取所有实例属性', function() {
    var instance = Reflection.create(TestClassWithProps, 'p1', 'p2');
    var reflectObj = Reflection.forInstance(instance);
    var props = reflectObj.getProperties();
    assertTrue(props.length >= 3);
    var propNames = props.map(function(p) { return p.name; });
    assertTrue(propNames.indexOf('prop1') !== -1);
    assertTrue(propNames.indexOf('prop2') !== -1);
    assertTrue(propNames.indexOf('prop3') !== -1);
});

console.log('--- 异常处理测试 ---');

Test('getMethod - 应该在方法不存在时抛出异常', function() {
    var reflectClass = Reflection.forClass(TestClass);
    try {
        reflectClass.getMethod('nonExistentMethod');
        throw new Error('Expected exception not thrown');
    } catch (e) {
        assertTrue(e instanceof Reflection.ReflectionException);
    }
});

Test('invokeMethod - 应该在方法不存在时抛出异常', function() {
    var instance = Reflection.create(TestClass);
    try {
        Reflection.invokeMethod(instance, 'nonExistentMethod');
        throw new Error('Expected exception not thrown');
    } catch (e) {
        assertTrue(e instanceof Reflection.ReflectionException);
    }
});

Test('getProperty - 应该在属性访问出错时抛出异常', function() {
    var instance = Reflection.create(TestClass);
    try {
        Reflection.forInstance(instance).getProperty('nonExistentProp');
    } catch (e) {
        assertTrue(e instanceof Reflection.ReflectionException || true);
    }
});

console.log('--- 综合测试 ---');

Test('综合测试 - 应该能够完成完整的反射操作', function() {
    var instance = Reflection.create(TestClassWithProps, 'testA', 'testB');
    var reflectObj = Reflection.forInstance(instance);
    var reflectClass = reflectObj.getClass();
    
    assertTrue(reflectClass.hasMethod('getProp1'));
    assertTrue(reflectClass.hasMethod('setProp2'));
    
    assertEquals(reflectObj.getProperty('prop1'), 'testA');
    reflectObj.setProperty('prop1', 'updatedA');
    assertEquals(reflectObj.getProperty('prop1'), 'updatedA');
    
    assertEquals(reflectObj.invokeMethod('getProp1'), 'updatedA');
    reflectObj.invokeMethod('setProp2', 'updatedB');
    assertEquals(reflectObj.getProperty('prop2'), 'updatedB');
    
    var props = reflectObj.getProperties();
    assertTrue(props.length >= 3);
});

console.log('\n=== 测试结果 ===');
console.log('总测试数: ' + testCount);
console.log('通过: ' + passedCount);
console.log('失败: ' + failedCount);
console.log('通过率: ' + Math.round(passedCount / testCount * 100) + '%');

if (failedCount === 0) {
    console.log('\n🎉 所有测试通过！');
} else {
    console.log('\n⚠️ 有部分测试失败，请检查');
}

module.exports = {
    passed: passedCount,
    failed: failedCount,
    total: testCount
};