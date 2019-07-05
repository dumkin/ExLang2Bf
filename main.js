document.querySelector("#convert").onclick = function () {
  var src = document.querySelector("#src").value;
  var bf = convert(src);
  document.querySelector("#bf").value = bf;
}

function convert(src) {
  var lines = src.split("\n");
  var result = "";

  var tempIndex = 0;
  var variables = {};
  var memory = {};
  var currentMemoryPointer = 0;
  var stackPointers = [];

  var getTempIndex = () => {
    return tempIndex++;
  }
  var getMemoryFreeIndex = () => {
    const length = Object.keys(memory).length;
    for (let i = 0; i < length; i++) {
      if (!(i in memory)) {
        return i;
      }
    }
    return length;
  }
  var getMemoryFromIndex = (to) => {
    for (let i = 0; i < Math.abs(currentMemoryPointer - to); i++) {
      if (currentMemoryPointer - to < 0) {
        result += ">";
      } else {
        result += "<";
      }
    }
    currentMemoryPointer = to;
  }
  var createVar = (key, value) => {
    switch (typeof value) {
      case "number":
        createVar_Int8(key, value);
        break;
      case "string":
        createVar_String(key, value);
        break;
      default:
        throw `unsupported type (${value})`;
    }
  }
  var deleteVar = (name) => {
    // const beforeIndex = currentMemoryPointer;

    // result += "before";
    // getMemoryFromIndex(variables[name].memoryIndex)
    // result += "[-]";

    delete variables[name];
    delete memory[name];

    //getMemoryFromIndex(beforeIndex)
    //result += "after";
  }
  var createVarCopy = (name) => {
    const copyName = `translator_temp_${getTempIndex()}_${name}_copy`;
    const newOrigName = `translator_temp_${getTempIndex()}_${name}_copy`;

    createVar(copyName, 0);
    createVar(newOrigName, 0);

    var orig = variables[name];
    var copy = variables[copyName];
    var newOrig = variables[newOrigName];

    getMemoryFromIndex(orig.memoryIndex);
    result += "[";
    getMemoryFromIndex(copy.memoryIndex);
    result += "+";
    getMemoryFromIndex(newOrig.memoryIndex);
    result += "+";
    getMemoryFromIndex(orig.memoryIndex);
    result += "-";
    result += "]";

    memory[newOrig.memoryIndex] = true;
    memory[copy.memoryIndex] = true;

    orig.memoryIndex = newOrig.memoryIndex;

    deleteVar(newOrigName);

    return copyName;
  }
  var createVarCopyPointersSafe = (name) => {
    const copyName = `translator_temp_${getTempIndex()}_${name}_copy`;
    const copyTempName = `translator_temp_${getTempIndex()}_${name}_copy`;

    createVar(copyName, 0);
    createVar(copyTempName, 0);

    var orig = variables[name];
    var copy = variables[copyName];
    var copyTemp = variables[copyTempName];

    getMemoryFromIndex(orig.memoryIndex);
    result += "[";
    getMemoryFromIndex(copy.memoryIndex);
    result += "+";
    getMemoryFromIndex(copyTemp.memoryIndex);
    result += "+";
    getMemoryFromIndex(orig.memoryIndex);
    result += "-";
    result += "]";

    getMemoryFromIndex(copyTemp.memoryIndex);
    result += "[";
    getMemoryFromIndex(orig.memoryIndex);
    result += "+";
    getMemoryFromIndex(copyTemp.memoryIndex);
    result += "-";
    result += "]";

    memory[copy.memoryIndex] = true;

    deleteVar(copyTempName);

    return copyName;
  }
  var createVar_Int8 = (name, value) => {
    if (!Number.isInteger(value)) {
      throw `variable int8 is not a integer - name: ${name}, value: ${value}`;
    }

    const valueNormalized = value % 256;
    const memoryIndex = getMemoryFreeIndex();

    variables[name] = {
      memoryIndex: memoryIndex,
      type: "int8"
    };
    memory[memoryIndex] = true;

    getMemoryFromIndex(memoryIndex);
    writeMemoryOptimized(valueNormalized);
  }
  var createVar_String = (key, value) => {
    if (typeof value !== "string") {
      throw `variable ${name} is not string (${value})`;
    }

    var memoryIndexes = [];
    var chars = [];
    for (let i = 0; i < value.length; i++) {
      const memoryIndex = getMemoryFreeIndex();
      memoryIndexes.push(memoryIndex);
      chars.push(value.charCodeAt(i));
      memory[memoryIndex] = true;
    }

    variables[key] = {
      memoryIndex: memoryIndexes,
      type: "string"
    };

    writeMemoryArrayOptimized(chars, memoryIndexes);
  }
  var writeMemoryLinear = (value) => {
    for (let i = 0; i < value; i++) {
      result += "+"
    }
  }
  var writeMemoryOptimized = (value) => {
    if (value < 11) {
      writeMemoryLinear(value);
      return;
    }

    var quotient = Math.floor(value / 10);
    var remainder = value % 10;

    const slotBefore = currentMemoryPointer;
    const slot = getMemoryFreeIndex();
    getMemoryFromIndex(slot);
    for (let i = 0; i < quotient; i++) {
      result += "+"
    }
    result += "["
    result += "-"
    getMemoryFromIndex(slotBefore);
    for (let i = 0; i < 10; i++) {
      result += "+"
    }
    getMemoryFromIndex(slot);
    result += "]"
    getMemoryFromIndex(slotBefore);
    for (let i = 0; i < remainder; i++) {
      result += "+"
    }
  }
  var writeMemoryArrayOptimized = (arr, indexes) => {
    const min = Math.min(...arr);

    const variableTemp = `translator_temp_line_${getTempIndex()}`;
    createVar(variableTemp, min)
    var slot = variables[variableTemp].memoryIndex;

    getMemoryFromIndex(slot);

    result += "["
    for (let i = 0; i < arr.length; i++) {
      getMemoryFromIndex(indexes[i]);
      result += "+";
    }
    getMemoryFromIndex(slot);
    result += "-";
    result += "]";

    for (let i = 0; i < arr.length; i++) {
      getMemoryFromIndex(indexes[i]);
      writeMemoryOptimized(arr[i] - min)
    }
    deleteVar(variableTemp);
  }
  var AreEqual = (left, right) => {
    var leftCopyName = createVarCopyPointersSafe(left);
    var leftCopy = variables[leftCopyName];

    var rightCopyName = createVarCopyPointersSafe(right);
    var rightCopy = variables[rightCopyName];

    getMemoryFromIndex(leftCopy.memoryIndex);
    result += "[";
    result += "-";
    getMemoryFromIndex(rightCopy.memoryIndex);
    result += "-";
    getMemoryFromIndex(leftCopy.memoryIndex);
    result += "]";
    result += "+";
    getMemoryFromIndex(rightCopy.memoryIndex);
    result += "[";
    getMemoryFromIndex(leftCopy.memoryIndex);
    result += "-";
    getMemoryFromIndex(rightCopy.memoryIndex);
    result += "[";
    result += "-";
    result += "]";
    result += "]";

    deleteVar(rightCopyName);

    return leftCopyName;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line == "" || (line[0] == "/" && line[1] == "/")) {
      continue;
    }
    const operators = line.split(" ");

    if (operators.length < 1) {
      return `Error: missing operator in ${i + 1} line.`;
    }

    switch (operators[0]) {
      case "var": {
        if (operators.length == 2) {
          createVar(operators[1], 0)
        } else if (operators.length == 3) {
          if (!isNaN(operators[2])) {
            operators[2] = Number(operators[2]);
          }
          console.log(`var ${operators[2]} is ${typeof operators[2]} type`);
          createVar(operators[1], operators[2])
        } else {
          return `Error: wrong number of parameters in ${operators[0]} operator in ${i + 1} line.`;
        }
        break;
      }
      case "add": {
        if (operators.length == 3) {
          const variable = variables[operators[1]];
          const variableAdd = variables[operators[2]];

          if (variable.type != variableAdd.type) {
            return `Error: different types on ${i + 1} line.`;
          }

          var copy = createVarCopyPointersSafe(operators[2]);

          memory[variable.memoryIndex] = true;

          var indexSlot = variables[copy].memoryIndex;
          getMemoryFromIndex(indexSlot);
          result += "[";
          result += "-";
          getMemoryFromIndex(variable.memoryIndex);
          result += "+";
          getMemoryFromIndex(indexSlot);
          result += "]";

          deleteVar(copy);
        }
        break;
      }
      case "out": {
        if (operators.length == 2) {
          const variable = operators[1];

          if (variables[variable].type == "number") {
            getMemoryFromIndex(variables[variable].memoryIndex);
            result += ".";
          } else if (variables[variable].type == "string") {
            for (let i = 0; i < variables[variable].memoryIndex.length; i++) {
              const e = variables[variable].memoryIndex[i];
              getMemoryFromIndex(e);
              result += ".";
            }
          }
        }
        break;
      }
      case "if": {
        if (operators.length == 4) {
          const left = variables[operators[1]];
          const op = operators[2];
          const right = variables[operators[3]];

          if (left.type != right.type) {
            return `Error: different types on ${i + 1} line.`;
          }

          switch (op) {
            case "=":
              const boolName = AreEqual(operators[1], operators[3])
              var bool = variables[boolName];

              getMemoryFromIndex(bool.memoryIndex);
              result += "[";
              stackPointers.push({
                ind: bool.memoryIndex,
                name: boolName,
              });
              break;

            default:
              break;
          }
        }
        break;
      }
      case "endif": {
        index = stackPointers[stackPointers.length - 1];

        getMemoryFromIndex(index.ind);
        deleteVar(index.name);
        stackPointers.pop();
        result += "-";
        result += "]";
        break;
      }
      case "for": {
        if (operators.length == 2) {
          const n = operators[1];

          if (isNaN(n)) {
            throw `Error: for index type not int8 on ${i + 1} line.`;
          }

          const varIndex = `translator_for_index_line_${i + 1}`;
          createVar(varIndex, Number(n));
          var indexator = variables[varIndex];

          getMemoryFromIndex(indexator.memoryIndex);
          result += "[";
          stackPointers.push({
            ind: indexator.memoryIndex,
            name: varIndex,
          });
        }
        break;
      }
      case "endfor": {
        index = stackPointers[stackPointers.length - 1];

        getMemoryFromIndex(index.ind);
        deleteVar(index.name);
        stackPointers.pop();
        result += "-";
        result += "]";
        break;
      }
      default: {
        return `Error: undefined ${operators[0]} operator in ${i + 1} line.`;
      }
    }
  }
  return result;
}

document.querySelector("#convert_new").onclick = function () {
  var src = document.querySelector("#src_new").value;
  var bf = convert_new(src);
  document.querySelector("#bf_new").value = bf;
}

function convert_new(src) {
  console.log(src);

  tokens = [];
  index = 0;

  while (src.length > index) {
    token = getToken(src, index);
    index = token.next;
    tokens.push(token);
  }

  console.log(tokens);

  let parser = new SyntaxParser(tokens)
  let node = parser.parse();
  console.log(node);
  console.log(printTree(node))

  // return src;
  return printTree(node);
}

var iota_data = 0;
var iota = (offset = -1) => {
  if (offset !== -1) {
    iota_data = offset;
  }
  return iota_data++;
}

const Tokens = {
  "fun": iota(0),
  "brace_open": iota(),
  "brace_close": iota(),
  "paren_open": iota(),
  "paren_close": iota(),
  "semicolon": iota(),
  "assign": iota(),
  "identifier": iota(),
  "number": iota(),
  "int": iota(),
  "out": iota(),
  "end": iota()
};

function getToken(code, index) {
  result = {
    index: index,
    next: index + 1,
    token: "undefined",
    value: ""
  };

  while (code.length > index && isSpace(code[index])) {
    index++;
    continue;
  }

  if (code.length == index) {
    result.next = code.length;
    result.token = "end";
    return result;
  }

  if (code[index] == '{') {
    result.next = index + 1;
    result.token = "brace_open";
    return result;
  }

  if (code[index] == '}') {
    result.next = index + 1;
    result.token = "brace_close";
    return result;
  }

  if (code[index] == '(') {
    result.next = index + 1;
    result.token = "paren_open";
    return result;
  }

  if (code[index] == ')') {
    result.next = index + 1;
    result.token = "paren_close";
    return result;
  }

  if (code[index] == ';') {
    result.next = index + 1;
    result.token = "semicolon";
    return result;
  }

  if (code[index] == '=') {
    result.next = index + 1;
    result.token = "assign";
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

    if (value == "fun") {
      result.token = "fun";
      return result;
    }

    if (value == "int") {
      result.token = "int";
      return result;
    }

    if (value == "out") {
      result.token = "out";
      return result;
    }

    result.token = "identifier";
    result.value = value;
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

function printSubTree(node, indent, root) {
  const ConnectChar = "|";
  const MiddleChar = "*";
  const LastChar = "-";

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
      indent += " ";
    }
  }

  result += node.type + ` (${node.text})` + "\n";
  for (let i = 0; i < node.childs.length; i++) {
    result += printSubTree(node.GetChild(i), indent, false);
  }
  return result;
}

function printTree(tree) {
  return printSubTree(tree, "", true);
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
    this.root = new AstNode("root", "", null, null);
  }

  Expr() {
    const c = this.tokens[this.index];

    if (c.token == "fun") {
      return this.Fun();
    } else if (c.token == "int") {
      return this.Int();
    } else if (c.token == "out") {
      return this.Out();
    }

    this.index++;
    return null;
  }

  Fun() {
    const fun = this.tokens[this.index];
    this.index++;

    const ident = this.Ident();

    const params = this.Params();

    const body = this.Body();

    return new AstNode("fun", "", ident, body);
  }

  Params() {
    const paramsOffset = this.WaitWithStack("paren_close", "paren_open", "paren_close");
    // this.index += paramsOffset;
    let endIndex = this.index + paramsOffset;

    let body = new AstNode("body", "", null, null);
    while (this.index < endIndex && this.NotEndTokens()) {
      body.AddChild(this.Expr());
    }

    if (this.index != endIndex) {
      console.log("wtf");
    }

    // this.index++;

    return body;
  }

  Ident() {
    const e = this.tokens[this.index];
    if (e.token !== "identifier") {
      throw "unexpected token";
    }

    this.index++;
    return new AstNode("identifier", e.value, null, null)
  }

  Body() {
    const paramsOffset = this.WaitWithStack("brace_close", "brace_open", "brace_close");
    let endIndex = this.index + paramsOffset;

    let body = new AstNode("body", "", null, null);
    while (this.index < endIndex && this.NotEndTokens()) {
      body.AddChild(this.Expr());
    }

    if (this.index != endIndex) {
      console.log("wtf");
    }

    return body;
  }

  WaitWithStack(token, stackOpen, stackClose) {
    let stack = 0;
    let offset = 0;

    let offsetToken = () => {
      return this.tokens[this.index + offset].token;
    };

    while (offsetToken() !== token || stack !== 1) {
      if (this.index + offset >= this.tokens.length || stack < 0) {
        throw "wtf";
      }

      if (offsetToken() === stackOpen) {
        stack++;
      }
      if (offsetToken() === stackClose) {
        stack--;
      }

      offset++;
    }

    return offset;
  }

  NotEndTokens(offset = 0) {
    return this.index + offset < this.tokens.length;
  }

  Int() {
    const int = this.tokens[this.index];
    if (int.token !== "int") {
      throw "unexpected token;"
    }
    this.index++;

    const ident = this.Ident();

    const assign = this.tokens[this.index];
    if (assign.token !== "assign") {
      throw "unexpected token;"
    }
    this.index++;

    const value = this.Number();

    const semi = this.tokens[this.index];
    if (semi.token !== "semicolon") {
      throw "unexpected token;"
    }
    this.index++;

    return new AstNode("int", "", ident, value);
  }

  Out() {
    const out = this.tokens[this.index];
    this.index++;

    const params = this.Params();

    const semicolon = this.tokens[this.index];
    this.index++;

    return new AstNode("out", "", params, null);
  }

  Number() {
    const e = this.tokens[this.index];
    if (e.token !== "number") {
      throw "unexpected token";
    }

    this.index++;
    return new AstNode("number", e.value, null, null)
  }

  parse() {
    while (this.NotEndTokens() && this.tokens[this.index].token !== "end") {
      this.root.AddChild(this.Expr());
    }
    return this.root;
  }
}