'use strict';

document.querySelector("#convert").onclick = function () {
  var src = document.querySelector("#src").value;
  var bf = compile(src);
  document.querySelector("#bf").value = bf;
}

function compile(src) {
  console.groupCollapsed("Source code");
  console.log(src);
  console.groupEnd();

  let tokens = GetTokens(src);

  console.groupCollapsed("Tokens");
  console.table(tokens);
  console.groupEnd();

  let parser = new SyntaxParser(tokens)
  let node = parser.buildAst();
  console.log(node);

  let printer = new TreeOut();
  let nodeText = printer.Print(node);

  console.log(nodeText)

  let compiler = new Compiler();

  let bin = compiler.compile(node);

  let binMin = LenOptimizer(bin);

  console.log(`bin remove extra symbols: ${bin.length - binMin.length}`);

  return binMin;
}

function GetTokens(src) {
  let tokens = [];
  let index = 0;

  while (src.length > index) {
    let token = getToken(src, index);
    index = token.next;
    tokens.push(token);
  }

  return tokens;
}

function LenOptimizer(src) {
  let oldSrc;
  do {
    oldSrc = src;

    src = src.replace('<>', '');
    src = src.replace('><', '');

    src = src.replace('+-', '');
    src = src.replace('-+', '');

  } while (oldSrc != src);

  return src;
}

var iota_data = 0;
var iota = (offset = -1) => {
  if (offset !== -1) {
    iota_data = offset;
  }
  return iota_data++;
}

const Tokens = {
  "text": iota(0),

  "number": iota(),
  "string": iota(),

  "brace_left": iota(),
  "brace_right": iota(),

  "paren_left": iota(),
  "paren_right": iota(),

  "quot": iota(),

  "semicolon": iota(),

  "assign": iota(),
  "plus": iota(),
  "minus": iota(),
  "less": iota(),
  "more": iota(),

  "equal": iota(),

  "if": iota(),
  "else": iota(),
  "while": iota(),
  "func": iota(),

  "out": iota(),

  "eof": iota(),
  "undefined": iota()
};

function getToken(code, index) {
  let result = {
    index: index,
    next: index + 1,
    token: "undefined",
    value: null
  };

  while (code.length > index && isSpace(code[index])) {
    index++;
    continue;
  }

  if (code.length == index) {
    result.next = code.length;
    result.token = "eof";
    return result;
  }

  if (code[index] == '{') {
    result.next = index + 1;
    result.token = "brace_left";
    return result;
  }

  if (code[index] == '}') {
    result.next = index + 1;
    result.token = "brace_right";
    return result;
  }

  if (code[index] == '(') {
    result.next = index + 1;
    result.token = "paren_left";
    return result;
  }

  if (code[index] == ')') {
    result.next = index + 1;
    result.token = "paren_right";
    return result;
  }

  if (code[index] == ';') {
    result.next = index + 1;
    result.token = "semicolon";
    return result;
  }

  if (code[index] == '=') {
    if (code.length > index + 1 && code[index + 1] == "=") {
      result.next = index + 2;
      result.token = "equal";
      return result;
    }
    result.next = index + 1;
    result.token = "assign";
    return result;
  }

  if (code[index] == '+') {
    result.next = index + 1;
    result.token = "plus";
    return result;
  }

  if (code[index] == '-') {
    result.next = index + 1;
    result.token = "minus";
    return result;
  }

  if (code[index] == '<') {
    result.next = index + 1;
    result.token = "less";
    return result;
  }

  if (code[index] == '>') {
    result.next = index + 1;
    result.token = "more";
    return result;
  }

  if (code[index] == '"') {
    result.next = index + 1;
    result.token = "quot";
    return result;
  }

  if (isNumber(code[index])) {
    let offset = 0;
    let value = code[index];

    do {
      offset++;
      value += code[index + offset];
    } while (code.length > index + offset && isNumber(code[index + offset]));
    value = value.slice(0, -1);

    result.next = index + offset;

    result.token = "number";
    result.value = value;
    return result;
  }

  if (isIdentifier(code[index])) {
    let offset = 0;
    let value = code[index];

    do {
      offset++;
      value += code[index + offset];
    } while (code.length > index + offset && isIdentifier(code[index + offset]));
    value = value.slice(0, -1);

    result.next = index + offset;

    if (value == "func") {
      result.token = "func";
      return result;
    }

    if (value == "if") {
      result.token = "if";
      return result;
    }

    if (value == "else") {
      result.token = "else";
      return result;
    }

    if (value == "while") {
      result.token = "while";
      return result;
    }

    if (value == "out") {
      result.token = "out";
      return result;
    }

    result.token = "text";
    result.value = value;
    return result;
  }

  console.error(`Unexpected syntax in ${index} index.`)
  throw "unexpected syntax";
}

function isSpace(char) {
  return /(\t| |\n)/.test(char);
}

function isIdentifier(str) {
  return /[a-zA-Z]/.test(str);
}

function isNumber(str) {
  return /[0-9]/.test(str);
}

class AstNode {
  type;
  text;
  parent = null;
  childs = [];

  constructor(type, text, child1, child2) {
    this.type = type;
    this.text = text;

    if (child1 != null) {
      this.AddChild(child1);
    }
    if (child2 != null) {
      this.AddChild(child2);
    }
  }

  AddChild(child) {
    if (child == null) {
      return;
    }
    if (child.parent != null) {
      delete child.parent.childs[child];
    }
    delete this.childs[child];
    this.childs.push(child);
    child.parent = this;
  }

  RemoveChild(child) {
    delete this.childs[child];
    if (child.parent == this) {
      child.parent = null;
    }
  }

  GetChild(index) {
    return this.childs[index];
  }

  IndexFromParent() {
    if (this.parent == null) {
      return -1;
    }
    return this.parent.childs.indexOf(this);
  }
}

class SyntaxParser {
  tokens;
  index = 0;
  root;

  constructor(tokens) {
    this.tokens = tokens;
    this.root = new AstNode("root", null, null, null);
  }

  Identifier() {
    console.group("Identifier");
    let node = null;

    if (this.currentToken() != "text") {
      throw "expected text";
    }

    console.log("find text: ", this.tokens[this.index].value);
    node = new AstNode("text", this.tokens[this.index].value, null, null);
    this.index++;

    console.groupEnd();
    return node;
  }

  Term() {
    console.group("Term");
    let node = null;

    if (this.currentToken() == "text") {
      node = this.Identifier();
      // console.log("find identifier: ", this.tokens[this.index].value);
      // node = new AstNode("identifier", this.tokens[this.index].value, null, null);
      // this.index++;
    } else if (this.currentToken() == "number") {
      console.log("find number: ", this.tokens[this.index].value);
      node = new AstNode("number", this.tokens[this.index].value, null, null);
      this.index++;
    } else {
      node = this.ExpressionParen();
    }

    console.groupEnd();
    return node;
  }

    Summa() {
    console.group("Summa");
    let node = this.Term();
    let kindType = null;

    while (this.currentToken() === "plus" || this.currentToken() === "minus") {
      if (this.currentToken() === "plus") {
        kindType = "plus";
      } else {
        kindType = "minus";
      }

      this.index++;

      console.log(`find token ${kindType}`);
      node = new AstNode(kindType, null, node, this.Term());
    }

    console.groupEnd();
    return node;
  }

  Test() {
    console.group("Test");
    let node = this.Summa();

    if (this.currentToken() === "less") {
      console.log(`find token less`);
      this.index++;

      let lessNode = new AstNode("less", null, node, this.Summa());

      console.groupEnd();
      return lessNode;
    }

    if (this.currentToken() === "equal") {
      console.log(`find token equal`);
      this.index++;

      let equalNode = new AstNode("equal", null, node, this.Summa());

      console.groupEnd();
      return equalNode;
    }

    console.groupEnd();
    return node;
  }

  Expression() {
    console.group("Expression");
    if (this.currentToken() !== "text") {
      let node = this.Test();
      console.groupEnd();
      return node;
    }

    let node = this.Test();

    if (this.currentToken() === "assign" && node.type === "text") {
      console.log(`find token assign`);
      this.index++;
      let setNode = new AstNode("set", null, node, this.Expression());

      console.groupEnd();
      return setNode;
    }

    console.groupEnd();
    return node;
  }

  ExpressionParen() {
    console.group("ExpressionParen");
    if (this.currentToken() !== "paren_left") {
      throw '"(" expected';
    }
    this.index++;

    let node = this.Expression();

    if (this.currentToken() !== "paren_right") {
      throw '")" expected';
    }
    this.index++;

    console.groupEnd();
    return node;
  }

  Statement() {
    let node = null;

    if (this.currentToken() == "func") {
      console.group("Function");
      node = new AstNode("func", null, null, null);
      this.index++;

      node.AddChild(this.Identifier());
      node.AddChild(this.ExpressionParen());
      node.AddChild(this.Statement());

      console.groupEnd();
    } else if (this.currentToken() == "if") {
      console.group("If");
      node = new AstNode("if", null, null, null);
      this.index++;

      node.AddChild(this.ExpressionParen());
      node.AddChild(this.Statement());

      console.groupEnd();

      if (this.currentToken() == "else") {
        console.group("Else");
        let elseNode = new AstNode("else", null, null, null);
        this.index++;

        elseNode.AddChild(this.Statement());

        node.AddChild(elseNode);
        console.groupEnd();
      }
    } else if (this.currentToken() == "out") {
      console.group("Out");
      node = new AstNode("out", null, null, null);
      this.index++;

      node.AddChild(this.ExpressionParen());
      this.index++;
      // node.AddChild(this.Statement());

      console.groupEnd();
    } else if (this.currentToken() == "while") {

    } else if (this.currentToken() == "do") {

    } else if (this.currentToken() == "semicolon") {
      console.group("semicolon");
      node = new AstNode("empty(semicolon)", null, null, null);
      this.index++;
      console.groupEnd();
    } else if (this.currentToken() == "brace_left") {
      console.group("Braces");

      node = new AstNode("statement", null, null, null);
      this.index++;

      while (this.currentToken() != "brace_right") {
        node = new AstNode("statement", null, node, this.Statement());
      }
      this.index++;

      console.groupEnd();
    } else {
      console.group("Another Statement");
      node = new AstNode("expression", null, null, null);
      node.AddChild(this.Expression());

      if (this.currentToken() != "semicolon") {
        console.log('";" expected');
      }

      this.index++;
      console.groupEnd();
    }

    return node;
  }

  currentToken() {
    return this.tokens[this.index].token;
  }

  eof() {
    return this.tokens.length <= this.index || this.tokens[this.index].token === "eof";
  }

  buildAst() {
    console.groupCollapsed("Parse AST tree");

    while (!this.eof()) {
      this.root.AddChild(this.Statement());
    }
    console.groupEnd();

    return this.root;
  }
}

class TreeOut {
  PrintSub(node, indent, root) {
    const ConnectChar = "| ";
    const MiddleChar = "├─";
    const LastChar = "└─";

    if (node == null) {
      return "";
    }

    let result = indent;

    if (!root) {
      if (node.IndexFromParent() < node.parent.childs.length - 1) {
        result += MiddleChar + " ";
        indent += ConnectChar + " ";
      } else {
        result += LastChar + " ";
        indent += "  ";
      }
    }

    result += node.type;
    if (node.text != null) {
      result += ` (${node.text})`;
    }
    result += "\n";

    for (let i = 0; i < node.childs.length; i++) {
      result += this.PrintSub(node.GetChild(i), indent, false);
    }
    return result;
  }

  Print(node) {
    return this.PrintSub(node, "", true);
  }
}

class Compiler {
  result = "";

  currentMemoryPointer = 0;
  stackPointers = [];

  iotaSecureIndex = 0;
  getIotaSecureIndex() {
    return this.iotaSecureIndex++;
  }

  variables = {};
  memory = {};
  memoryGetFreeIndex() {
    const length = Object.keys(this.memory).length;
    for (let i = 0; i < length; i++) {
      if (!(i in this.memory)) {
        return i;
      }
    }
    return length;
  }
  // memoryGetFreeArrayIndex() {}
  memoryPointerByName(name) {
    const to = this.variables[name].memoryIndex;

    for (let i = 0; i < Math.abs(this.currentMemoryPointer - to); i++) {
      if (this.currentMemoryPointer - to < 0) {
        this.result += ">";
      } else {
        this.result += "<";
      }
    }
    this.currentMemoryPointer = to;
  }
  memoryPointerByIndex(to) {
    for (let i = 0; i < Math.abs(this.currentMemoryPointer - to); i++) {
      if (this.currentMemoryPointer - to < 0) {
        this.result += ">";
      } else {
        this.result += "<";
      }
    }
    this.currentMemoryPointer = to;
  }
  memoryAllocate(name, type, index) {
    this.variables[name] = {
      memoryIndex: index,
      type: type
    };
    this.memory[index] = true;
  }
  memoryFree(name, fillZero = false, safeCurrentPointer = false) {
    const beforeIndex = this.currentMemoryPointer;
    const v = this.variables[name];

    if (fillZero) {
      switch (v.type) {
        case "int8":
          this.memoryPointerByIndex(v.memoryIndex)
          this.result += "[-]";
          break;
        default:
          break;
      }
    }

    delete this.variables[name];
    delete this.memory[v.memoryIndex];

    if (safeCurrentPointer) {
      this.memoryPointerByIndex(beforeIndex);
    }
  }
  memoryWriteLinear(value) {
    for (let i = 0; i < value; i++) {
      this.result += "+"
    }
  }
  memoryWriteOptimized(value) {
    if (value < 11) {
      this.memoryWriteLinear(value);
      return;
    }

    var quotient = Math.floor(value / 10);
    var remainder = value % 10;

    const slotBefore = this.currentMemoryPointer;
    const slot = this.memoryGetFreeIndex();
    this.memoryPointerByIndex(slot);
    for (let i = 0; i < quotient; i++) {
      this.result += "+"
    }
    this.result += "["
    this.result += "-"
    this.memoryPointerByIndex(slotBefore);
    for (let i = 0; i < 10; i++) {
      this.result += "+"
    }
    this.memoryPointerByIndex(slot);
    this.result += "]"
    this.memoryPointerByIndex(slotBefore);
    for (let i = 0; i < remainder; i++) {
      this.result += "+"
    }
  }
  memoryWriteArrayOptimized(arr, indexes) {
    const min = Math.min(...arr);

    const variableTemp = `_compiler_${this.getTempIndex()}`;
    this.createVar(variableTemp, min)
    var slot = this.variables[variableTemp].memoryIndex;

    this.memoryPointerByIndex(slot);

    this.result += "["
    for (let i = 0; i < arr.length; i++) {
      this.memoryPointerByIndex(indexes[i]);
      this.result += "+";
    }
    this.memoryPointerByIndex(slot);
    this.result += "-";
    this.result += "]";

    for (let i = 0; i < arr.length; i++) {
      this.memoryPointerByIndex(indexes[i]);
      this.memoryWriteOptimized(arr[i] - min)
    }
    this.memoryFree(variableTemp, true, true);
  }

  varCreate(name, value) {
    switch (typeof value) {
      case "number":
        this.varCreate_Int8(name, value);
        break;
      case "string":
        this.varCreate_String(name, value);
        break;
      default:
        throw `unsupported type (${value})`;
    }
  }
  varCopyByName(name, sourceName) {
    this.varCopyByIndex(name, this.variables[sourceName].memoryIndex);
  }
  varCopyByIndex(name, sourceIndex) {
    const copyTempName = `compilator_${this.getIotaSecureIndex()}`;

    this.varCreate(name, 0);
    this.varCreate(copyTempName, 0);

    this.memoryPointerByIndex(sourceIndex);
    this.result += "[";
    this.memoryPointerByName(name);
    this.result += "+";
    this.memoryPointerByName(copyTempName);
    this.result += "+";
    this.memoryPointerByIndex(sourceIndex);
    this.result += "-";
    this.result += "]";

    this.memoryPointerByName(copyTempName);
    this.result += "[";
    this.memoryPointerByIndex(sourceIndex);
    this.result += "+";
    this.memoryPointerByName(copyTempName);
    this.result += "-";
    this.result += "]";

    this.memoryFree(copyTempName, true, true);
  }

  varCreate_Int8(name, value) {
    if (!Number.isInteger(value)) {
      throw `variable int8 is not a integer - name: ${name}, value: ${value}`;
    }

    const valueNormalized = value % 256;
    const memoryIndex = this.memoryGetFreeIndex();

    this.memoryAllocate(name, "int8", memoryIndex);

    this.memoryPointerByIndex(memoryIndex);
    this.memoryWriteOptimized(valueNormalized);
  }
  varCreate_String(name, value) {
    throw "string var crreate does not work";
    if (typeof value !== "string") {
      throw `variable ${name} is not string (${value})`;
    }

    var memoryIndexes = [];
    var chars = [];
    for (let i = 0; i < value.length; i++) {
      const memoryIndex = this.memoryGetFreeIndex();
      memoryIndexes.push(memoryIndex);
      chars.push(value.charCodeAt(i));
      this.memory[memoryIndex] = true;
    }

    this.variables[name] = {
      memoryIndex: memoryIndexes,
      type: "string"
    };

    this.writeMemoryArrayOptimized(chars, memoryIndexes);
  }

  AreEqual(left, right) {
    var leftCopyName = this.createVarCopyPointersSafe(left);
    var leftCopy = this.variables[leftCopyName];

    var rightCopyName = this.createVarCopyPointersSafe(right);
    var rightCopy = this.variables[rightCopyName];

    this.getMemoryFromIndex(leftCopy.memoryIndex);
    this.result += "[";
    this.result += "-";
    this.getMemoryFromIndex(rightCopy.memoryIndex);
    this.result += "-";
    this.getMemoryFromIndex(leftCopy.memoryIndex);
    this.result += "]";
    this.result += "+";
    this.getMemoryFromIndex(rightCopy.memoryIndex);
    this.result += "[";
    this.getMemoryFromIndex(leftCopy.memoryIndex);
    this.result += "-";
    this.getMemoryFromIndex(rightCopy.memoryIndex);
    this.result += "[";
    this.result += "-";
    this.result += "]";
    this.result += "]";

    this.deleteVar(rightCopyName);

    return leftCopyName;
  }

  compile(node) {
    switch (node.type) {
      case "func":
        break;
      case "set":
        console.log(`create var ${node.childs[0].type}(${node.childs[0].text}) ${node.childs[1].type}(${node.childs[1].text})`);

        if (node.childs[1].type === "plus") {
          this.compile(node.childs[1]);

          this.varCopyByIndex(node.childs[0].text, this.currentMemoryPointer);

          return;
        }
        if (node.childs[1].type === "text") {
          this.varCopyByName(node.childs[0].text, node.childs[1].text);

          return;
        }

        this.varCreate(node.childs[0].text, Number(node.childs[1].text));
        break;
      case "plus":
        const first = node.childs[0];
        const second = node.childs[1];

        console.log(`plus ${first.type}(${first.text}) ${second.type}(${second.text})`);

        let firstVarName;
        let secondVarName;

        let firstVarForRemove = false;
        let secondVarForRemove = false;

        switch (first.type) {
          case "text":
            firstVarName = first.text;
            break;
          case "number":
            firstVarName = `translator_temp_line_${this.getIotaSecureIndex()}`;
            this.varCreate(firstVarName, Number(first.text));
            firstVarForRemove = true;
            break;
          default:
            throw "unexpected type: " + first;
        }

        switch (second.type) {
          case "text":
            secondVarName = second.text;
            break;
          case "number":
            secondVarName = `translator_temp_line_${this.getIotaSecureIndex()}`;
            this.varCreate(secondVarName, Number(second.text));
            secondVarForRemove = true;
            break;
          default:
            throw "unexpected type: " + second;
        }

        const copyFirstName = `compilator_${this.getIotaSecureIndex()}`;
        const copySecondName = `compilator_${this.getIotaSecureIndex()}`;

        this.varCopyByName(copyFirstName, firstVarName);
        this.varCopyByName(copySecondName, secondVarName);

        var copyFirstIndexSlot = this.variables[copyFirstName].memoryIndex;
        var copySecondIndexSlot = this.variables[copySecondName].memoryIndex;

        this.memoryPointerByIndex(copySecondIndexSlot);
        this.result += "[";
        this.result += "-";
        this.memoryPointerByIndex(copyFirstIndexSlot);
        this.result += "+";
        this.memoryPointerByIndex(copySecondIndexSlot);
        this.result += "]";

        // this.memoryFree(copyFirstName); // TODO: лупится, WTF?
        this.memoryFree(copySecondName, true, true);
        if (firstVarForRemove) {
          this.memoryFree(firstVarName, true, true);
        }
        if (secondVarForRemove) {
          this.memoryFree(secondVarName, true, true);
        }

        // Положил сумму на вершину стека
        this.memoryPointerByIndex(copyFirstIndexSlot);

        break;
      case "if":
        // console.log(`create var`, node.childs);
        // this.createVar(node.childs[0].text, Number(node.childs[1].text));
        break;
      case "out":
        const beforeIndex = this.currentMemoryPointer;

        this.memoryPointerByName(node.childs[0].text);
        this.result += ".";
        this.memoryPointerByIndex(beforeIndex);

        
        // console.log(`out`, node.childs);
        // this.createVar(node.childs[0].text, Number(node.childs[1].text));
        break;
      default:
        for (let i = 0; i < node.childs.length; i++) {
          const child = node.childs[i];

          this.compile(child);
        }
        break;
    }

    return this.result
  }
}