var Reflection = require('./reflection');

console.log('=== Reflection (反射) 机制使用示例 ===\n');

function Person(name, age) {
    this.name = name;
    this.age = age;
    this.createdAt = new Date();
}

Person.prototype.sayHello = function() {
    return 'Hello, my name is ' + this.name;
};

Person.prototype.greet = function(otherName) {
    return 'Hello ' + otherName + ', I am ' + this.name;
};

Person.prototype.getInfo = function() {
    return {
        name: this.name,
        age: this.age,
        createdAt: this.createdAt
    };
};

function Contract(parties, terms) {
    this.parties = parties;
    this.terms = terms;
    this.signed = false;
    this.createdDate = new Date();
}

Contract.prototype.sign = function() {
    this.signed = true;
    return this;
};

Contract.prototype.validate = function() {
    return this.parties.length === 2 && this.terms.length > 0;
};

Contract.prototype.getSummary = function() {
    return {
        parties: this.parties,
        termsCount: this.terms.length,
        signed: this.signed,
        createdDate: this.createdDate
    };
};

function RiskAssessor() {
    this.riskLevel = 'unknown';
    this.assessmentDate = null;
}

RiskAssessor.prototype.assess = function(contractText) {
    var score = contractText.length * 2;
    if (score > 100) score = 100;
    if (score > 70) this.riskLevel = 'high';
    else if (score > 40) this.riskLevel = 'medium';
    else this.riskLevel = 'low';
    this.assessmentDate = new Date();
    return this.riskLevel;
};

RiskAssessor.prototype.getAssessment = function() {
    return {
        riskLevel: this.riskLevel,
        assessmentDate: this.assessmentDate
    };
};

console.log('--- 示例1：类信息获取 ---');
var PersonReflection = Reflection.forClass(Person);
console.log('类名:', PersonReflection.getName());
console.log('类方法数量:', PersonReflection.getMethods().length);
var methods = PersonReflection.getMethods();
console.log('类方法列表:');
methods.forEach(function(method) {
    var params = method.parameters.map(function(p) { return p.name; }).join(', ');
    console.log('  - ' + method.name + '(' + params + ')');
});
console.log();

console.log('--- 示例2：动态创建对象 ---');
var person = Reflection.create(Person, '张三', 25);
console.log('创建的对象:', person);
console.log('对象类型:', Reflection.getType(person));
console.log('是否是Person实例:', Reflection.isInstanceOf(person, Person));
console.log();

console.log('--- 示例3：动态调用方法 ---');
var reflectPerson = Reflection.forInstance(person);
var greeting = reflectPerson.invokeMethod('sayHello');
console.log('调用sayHello()结果:', greeting);
var greetTo = reflectPerson.invokeMethod('greet', '李四');
console.log('调用greet("李四")结果:', greetTo);
var info = reflectPerson.invokeMethod('getInfo');
console.log('调用getInfo()结果:', info);
console.log();

console.log('--- 示例4：动态访问和修改属性 ---');
console.log('当前name属性:', reflectPerson.getProperty('name'));
reflectPerson.setProperty('name', '王五');
console.log('修改后的name属性:', reflectPerson.getProperty('name'));
reflectPerson.setProperty('age', 30);
console.log('修改后的age属性:', reflectPerson.getProperty('age'));
console.log('所有属性:');
var props = reflectPerson.getProperties();
props.forEach(function(prop) {
    console.log('  - ' + prop.name + ' (' + prop.type + '):', prop.value);
});
console.log();

console.log('--- 示例5：合同类示例 ---');
var ContractReflection = Reflection.forClass(Contract);
console.log('合同类方法:');
ContractReflection.getMethods().forEach(function(method) {
    console.log('  - ' + method.name + '()');
});

var contract = Reflection.create(Contract, ['甲方', '乙方'], ['条款1', '条款2']);
var reflectContract = Reflection.forInstance(contract);

console.log('初始合同状态:', contract.signed);
reflectContract.invokeMethod('sign');
console.log('调用sign()后状态:', contract.signed);

var isValid = reflectContract.invokeMethod('validate');
console.log('合同验证结果:', isValid);

var summary = reflectContract.invokeMethod('getSummary');
console.log('合同摘要:', summary);
console.log();

console.log('--- 示例6：风险评估器示例 ---');
var assessor = Reflection.create(RiskAssessor);
var reflectAssessor = Reflection.forInstance(assessor);

var contractText = '这是一份测试合同文本...';
var riskLevel = reflectAssessor.invokeMethod('assess', contractText);
console.log('合同风险评估:', riskLevel);

var assessment = reflectAssessor.invokeMethod('getAssessment');
console.log('详细评估结果:', assessment);
console.log();

console.log('--- 示例7：异常处理示例 ---');
try {
    reflectPerson.invokeMethod('nonExistentMethod');
} catch (e) {
    if (e instanceof Reflection.ReflectionException) {
        console.log('捕获到反射异常:', e.message);
    }
}

try {
    reflectPerson.getProperty('nonExistentProperty');
} catch (e) {
    if (e instanceof Reflection.ReflectionException) {
        console.log('捕获到反射异常:', e.message);
    }
}
console.log();

console.log('--- 示例8：类型检查和安全机制 ---');
console.log('Person是否是类:', Reflection.TypeChecker.isClass(Person));
console.log('sayHello是否是函数:', Reflection.TypeChecker.isFunction(person.sayHello));
console.log('person是否是对象:', Reflection.TypeChecker.isObject(person));
console.log('获取person类型:', Reflection.getType(person));
console.log();

console.log('--- 示例9：通用反射工具函数 ---');
console.log('Reflection.forClass():', typeof Reflection.forClass);
console.log('Reflection.forInstance():', typeof Reflection.forInstance);
console.log('Reflection.create():', typeof Reflection.create);
console.log('Reflection.getProperty():', typeof Reflection.getProperty);
console.log('Reflection.setProperty():', typeof Reflection.setProperty);
console.log('Reflection.invokeMethod():', typeof Reflection.invokeMethod);
console.log('Reflection.isInstanceOf():', typeof Reflection.isInstanceOf);
console.log('Reflection.getType():', typeof Reflection.getType);

console.log('\n=== 所有示例完成 ===');