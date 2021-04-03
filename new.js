'use strict';

var iota_data = 0;
var iota = (offset = -1) => {
  if (offset !== -1) {
    iota_data = offset;
  }
  return iota_data++;
}

const Tokens = {
  "identifier": "identifier",

  "number": "number",
  "string": "string",

  "brace_left": "brace_left",
  "brace_right": "brace_right",

  "paren_left": "paren_left",
  "paren_right": "paren_right",

  "quot": "quot",

  "semicolon": "semicolon",

  "assign": "assign",
  "plus": "plus",
  "minus": "minus",
  "less": "less",
  "more": "more",
  "div": "div",

  "equal": "equal",

  "if": "if",
  "else": "else",
  "while": "while",
  "func": "func",

  "out": "out",

  "eof": "eof",
  "undefined": "undefined"
};

class Tokenizer {
  init(string) {
    this._string = string;
    this._cursor = 0;
  }

  hasMoreTokens() {
    return this._cursor < this._string.length;
  }

  eof() {
    if (this._cursor > this._string.length) {
      console.warn("Cursor overflow");
    }
    return this._cursor >= this._string.length;
  }

  getNextToken() {
    if (!this.hasMoreTokens()) {
      return null;
    }

    // const string = this._string.slice(this._cursor);
    let currentSymbol = () => this.eof() ? null : this._string[this._cursor];

    let token = {
      index: this._cursor,
      next: this._cursor + 1,
      type: "undefined",
      value: null
    };

    while (!this.eof() && this._isSpace(currentSymbol())) {
      this._cursor++;
      continue;
    }

    if (this.eof()) {
      token.next = this._string.length;
      token.type = Tokens.eof;
      return token;
    }

    if (currentSymbol() == '{') {
      this._cursor++;

      token.next = this._cursor;
      token.type = Tokens.brace_left;
      return token;
    }

    if (currentSymbol() == '}') {
      this._cursor++;

      token.next = this._cursor;
      token.type = Tokens.brace_right;
      return token;
    }

    if (currentSymbol() == '(') {
      this._cursor++;

      token.next = this._cursor;
      token.type = Tokens.paren_left;
      return token;
    }

    if (currentSymbol() == ')') {
      this._cursor++;

      token.next = this._cursor;
      token.type = Tokens.paren_right;
      return token;
    }

    if (currentSymbol() == ';') {
      this._cursor++;

      token.next = this._cursor;
      token.type = Tokens.semicolon;
      return token;
    }

    if (currentSymbol() == '/') {
      this._cursor++;

      token.next = this._cursor;
      token.type = Tokens.div;
      return token;
    }

    if (currentSymbol() == '=') {
      this._cursor++;

      if (!this.eof() && currentSymbol() == "=") {
        this._cursor++;

        token.next = this._cursor;
        token.type = Tokens.equal;
        return token;
      }
      token.next = this._cursor;
      token.type = Tokens.assign;
      return token;
    }

    if (currentSymbol() == '+') {
      this._cursor++;

      token.next = this._cursor;
      token.type = Tokens.plus;
      return token;
    }

    if (currentSymbol() == '-') {
      this._cursor++;

      token.next = this._cursor;
      token.type = Tokens.minus;
      return token;
    }

    if (currentSymbol() == '<') {
      this._cursor++;

      token.next = this._cursor;
      token.type = Tokens.less;
      return token;
    }

    if (currentSymbol() == '>') {
      this._cursor++;

      token.next = this._cursor;
      token.type = Tokens.more;
      return token;
    }

    // String
    if (currentSymbol() == '"') {
      this._cursor++;

      let value = '';
      while (!this.eof() && currentSymbol() != '"') {
        value += currentSymbol();
        this._cursor++;
      }
      this._cursor++;

      token.next = this._cursor;
      token.type = Tokens.string;
      token.value = value;

      return token;
    }

    // Numbers
    if (this.isNumber(currentSymbol())) {
      let number = '';
      while (!this.eof() && this.isNumber(currentSymbol())) {
        number += currentSymbol();
        this._cursor++;
      }

      token.next = this._cursor;
      token.type = Tokens.number;
      token.value = number;

      return token;
    }

    // Identifier
    if (this.isIdentifier(currentSymbol())) {
      let value = '';
      while (!this.eof() && this.isIdentifier(currentSymbol())) {
        value += currentSymbol();
        this._cursor++;
      }

      token.next = this._cursor;

      if (value == "func") {
        token.type = Tokens.func;
        return token;
      }

      if (value == "if") {
        token.type = Tokens.if;
        return token;
      }

      if (value == "else") {
        token.type = Tokens.else;
        return token;
      }

      if (value == "while") {
        token.type = Tokens.whilev;
        return token;
      }

      if (value == "out") {
        token.type = Tokens.out;
        return token;
      }

      token.type = Tokens.identifier;
      token.value = value;
      return token;
    }

    console.error(`Unexpected syntax in ${this._cursor} index.`)
    throw "unexpected syntax";
  }

  _isSpace(char) {
    return /(\t| |\n)/.test(char);
  }

  isIdentifier(str) {
    return /[a-zA-Z0-9_]/.test(str);
  }

  isNumber(str) {
    return /[0-9]/.test(str);
  }
}

class Parser {
  constructor() {
    this._string = '';
    this._tokenizer = new Tokenizer();
  }

  parse(string) {
    this._string = string;
    this._tokenizer.init(string);

    this._lookahead = this._tokenizer.getNextToken();

    console.groupCollapsed("Parser");

    let root = new AstNode("root", null, null, null);

    while (!this._tokenizer.eof()) {
      let node = this.Statement();
      if (node != null) {
        root.AddChild(node);
      }
    }
    console.groupEnd();

    return root;
  }

  _take(tokenType) {
    const token = this._lookahead;

    if (token == null) {
      throw new SyntaxError(`Unexpected end of input, expected: "${tokenType}"`);
    }

    if (token.type !== tokenType) {
      throw new SyntaxError(`Unexpected token: "${token.value}", expected: "${tokenType}"`);
    }

    this._lookahead = this._tokenizer.getNextToken();

    return token;
  }

  Statement() {
    if (this._lookahead.type == Tokens.out) {
      let token = this._take(Tokens.out);
      let leftNode = this.ExpressionParen();

      let node = new AstNode(token.type, null, leftNode, null);

      return node;
    } else if (this._lookahead.type == Tokens.semicolon) {
      this._take(Tokens.semicolon);
      return null;
      // return new AstNode("empty", null, null, null)
    } else {
      return this.Expression();
    }
  }

  // Expression ::= Test | (Test & Assign & Expression)
  Expression() {
    console.group("Expression");

    let leftToken = this._lookahead;
    let leftNode = this.Test();

    if (leftToken.type == Tokens.identifier && this._lookahead.type == Tokens.assign) {
      let assing = this._take(Tokens.assign);

      let rightNode = this.Expression();

      let node = new AstNode(assing.type, null, leftNode, rightNode);

      console.groupEnd();
      return node;
    }
  
    console.groupEnd();
    return leftNode;
  }

  // Div ::= (Term & (Div) & Term) | Term
  Div() {
    console.group("Div");
    let leftNode = this.Term();

    if (this._lookahead.type != Tokens.div) {
      console.groupEnd();
      return leftNode;
    }

    let op = this._take(this._lookahead.type);

    let rightNode = this.Term();

    let node = new AstNode(op.type, null, leftNode, rightNode);

    console.groupEnd();
    return node;
  }

  // Summa ::= (Div & (Plus | Minus) & Div) | Div
  Summa() {
    console.group("Summa");
    let leftNode = this.Div();

    if (this._lookahead.type != Tokens.plus && this._lookahead.type != Tokens.minus) {
      console.groupEnd();
      return leftNode;
    }

    let op = this._take(this._lookahead.type);

    let rightNode = this.Div();

    let node = new AstNode(op.type, null, leftNode, rightNode);

    console.groupEnd();
    return node;
  }

  // Test ::= (Summa & (Less | Equal) & Summa) | Summa
  Test() {
    console.group("Test");
    let leftNode = this.Summa();

    if (this._lookahead.type != Tokens.less && this._lookahead.type != Tokens.equal) {
      console.groupEnd();
      return leftNode;
    }

    let op = this._take(this._lookahead.type);

    let rightNode = this.Summa();

    let node = new AstNode(op.type, null, leftNode, rightNode);

    console.groupEnd();
    return node;
  }

  // ExpressionParen ::= (Expression)
  ExpressionParen() {
    console.group("ExpressionParen");
    if (this._lookahead.type == Tokens.paren_left) {
      this._take(Tokens.paren_left);
    } else {
      throw new SyntaxParser("Unexpected token")
    }

    let node = this.Expression();

    if (this._lookahead.type == Tokens.paren_right) {
      this._take(Tokens.paren_right);
    } else {
      throw new SyntaxParser("Unexpected token")
    }

    console.groupEnd();
    return node;
  }

  // Term ::= Literal | ExpressionParen
  Term() {
    console.group("Term");
    if (this._lookahead.type == Tokens.paren_left) {
      let node = this.ExpressionParen();
      console.groupEnd();
      return node;
    } else {
      let node = this.Literal();
      console.groupEnd();
      return node;
    }
  }

  // Literal ::= NumericLiteral | StringLiteral
  Literal() {
    console.group("Literal");
    if (this._lookahead.type == Tokens.string) {
      let node = this.StringLiteral();
      console.groupEnd();
      return node;
    } else if (this._lookahead.type == Tokens.number) {
      let node = this.NumericLiteral();
      console.groupEnd();
      return node;
    } else if (this._lookahead.type == Tokens.identifier) {
      let node = this.Identifier();
      console.groupEnd();
      return node;
    }

    throw new SyntaxParser("Unexpected token")
  }

  // Identifier ::= qwe
  Identifier() {
    console.group("Identifier");
    const token = this._take(Tokens.identifier);

    let node = new AstNode(token.type, token.value, null, null);

    console.groupEnd();
    return node;
  }

  // NumericLiteral ::= 123
  NumericLiteral() {
    console.group("NumericLiteral");
    const token = this._take(Tokens.number);

    let node = new AstNode(token.type, token.value, null, null);

    console.groupEnd();
    return node;
  }

  // NumericLiteral ::= "qwe"
  StringLiteral() {
    console.group("StringLiteral");
    const token = this._take(Tokens.string);

    let node = new AstNode(token.type, token.value, null, null);

    console.groupEnd();
    return node;
  }
}


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

  let nodes;
  try {
    let parser = new Parser()
    nodes = parser.parse(src);
    console.log(nodes);

    let printer = new TreeOut();
    console.log(printer.Print(nodes))
  } catch (error) {
    console.error(error);
  }

  try {
    // let parser = new SyntaxParser(tokens)
    // let node = parser.buildAst();
    // console.log(node);

    // let printer = new TreeOut();
    // let nodeText = printer.Print(node);
    // console.log(nodeText)
  } catch (error) {
    
  }

  let compiler = new Compiler();

  let bin = compiler.compile(nodes);

  let binMin = LenOptimizer(bin);

  console.log(`bin remove extra symbols: ${bin.length - binMin.length}`);

  return bin;
}

function GetTokens(src) {
  let tokens = [];
  let tokenizer = new Tokenizer();
  tokenizer.init(src);

  let token;
  try {
    do {
      token = tokenizer.getNextToken();
      if (token != null) {
        tokens.push(token)
      }
    } while (token != null);
  } catch (error) {

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

  // Identifier ::= text
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

  // Term ::= Identifier | number | ExpressionParen
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

  // Summa ::= (Term & (Plus | Minus) & Term) | Term
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

  // Test ::= (Summa & (Less | Equal) & Summa) | Summa
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

  // Expression ::= Test | (Test & Assign & Expression)
  Expression() {
    console.group("Expression");
    if (this.currentToken() !== "text") {
      console.warn("Expression - this.currentToken() !== text | " + this.currentToken());
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

  // ExpressionParen ::= (Expression)
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

  // Statement ::= 
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
    return this.tokens[this.index].type;
  }

  eof() {
    return this.tokens.length <= this.index || this.tokens[this.index].type === "eof";
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

    const variableTemp = `_compiler_${this.getIotaSecureIndex()}`;
    this.varCreate(variableTemp, min)
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
    // throw "string var crreate does not work";
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

    this.memoryWriteArrayOptimized(chars, memoryIndexes);
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

  Division(divided, divisor) {
    const beforeIndex = this.currentMemoryPointer;

    let temp1 = `Division_temp_${this.getIotaSecureIndex()}`;
    var dividedCopy = this.varCopyByName(temp1, divided);

    let temp2 = `Division_temp_${this.getIotaSecureIndex()}`;
    var divisorCopy = this.varCopyByName(temp2, divisor);

    let temp3 = `Division_temp_${this.getIotaSecureIndex()}`;
    this.varCreate(temp3, 0);

    let temp4 = `Division_temp_${this.getIotaSecureIndex()}`;
    this.varCreate(temp4, 0);

    let temp6 = `Division_temp_${this.getIotaSecureIndex()}`;
    this.varCreate(temp6, 0);

    this.memoryPointerByName(temp1);
    this.result += "[";

    this.memoryPointerByName(temp2);
    this.result += "[";
    this.result += "-";
    this.memoryPointerByName(temp3);
    this.result += "+";
    this.memoryPointerByName(temp4);
    this.result += "+";
    this.memoryPointerByName(temp2);
    this.result += "]";

    this.memoryPointerByName(temp4);
    this.result += "[";
    this.result += "-";
    this.memoryPointerByName(temp2);
    this.result += "+";
    this.memoryPointerByName(temp4);
    this.result += "]";

    this.memoryPointerByName(temp3);
    this.result += "[";
    this.result += "-";
    this.memoryPointerByName(temp1);
    this.result += "-";
    this.memoryPointerByName(temp3);
    this.result += "]";

    this.memoryPointerByName(temp6);
    this.result += "+";
    this.memoryPointerByName(temp1);
    this.result += "]";

    this.memoryPointerByName(temp2);
    this.result += "[";
    this.result += "-";
    this.result += "]";

    this.memoryPointerByName(temp6);
    this.result += "[";
    this.result += "-";
    this.memoryPointerByName(temp1);
    this.result += "+";
    this.memoryPointerByName(temp6);
    this.result += "]";

    this.memoryFree(temp2, true, true);
    this.memoryFree(temp3, true, true);
    this.memoryFree(temp4, true, true);
    this.memoryFree(temp6, true, true);

    this.memoryPointerByName(temp1);

    return temp1;
  }

  Division2(divided, divisor) {

    let x = `division_temp_${this.getIotaSecureIndex()}`;
    this.varCopyByName(x, divided);

    let y = `division_temp_${this.getIotaSecureIndex()}`;
    this.varCopyByName(y, divisor);

    let temp0 = `division_temp_${this.getIotaSecureIndex()}`;
    this.varCreate(temp0, 0);

    let temp1 = `division_temp_${this.getIotaSecureIndex()}`;
    this.varCreate(temp1, 0);

    let q = `division_temp_${this.getIotaSecureIndex()}`;
    this.varCreate(q, 0);

    let nil = `division_temp_${this.getIotaSecureIndex()}`;
    this.varCreate(nil, 0);


    this.memoryPointerByName(x);
    this.result += "[";

    this.memoryPointerByName(temp1);
    this.result += "+";
    this.result += "[";
    this.memoryPointerByName(y);
    this.result += "[";
    this.memoryPointerByName(x);
    this.result += "-";
    this.result += "[";
    this.memoryPointerByName(temp1);
    this.result += "+";

    this.memoryPointerByName(nil);
    this.result += "[";
    this.result += "-";
    this.result += "]";
    
    this.result += "]";

    /*
x[
 temp1+[
  y[x-[temp1+†]temp1-temp0+y-]
  temp0[y+temp0-]q+temp1
 ]
]
x[y[temp0+x+y-]temp0[y+temp0-]q-†]
    */

    this.memoryPointerByName(temp1);
    this.result += "-";
    this.memoryPointerByName(temp0);
    this.result += "+";
    this.memoryPointerByName(y);
    this.result += "-";
    this.result += "]";

    this.memoryPointerByName(temp0);
    this.result += "[";
    this.memoryPointerByName(y);
    this.result += "+";
    this.memoryPointerByName(temp0);
    this.result += "-";
    this.result += "]";
    this.memoryPointerByName(q);
    this.result += "+";
    this.memoryPointerByName(temp1);

    this.result += "]";
    this.result += "]";

    /*
x[
 temp1+[
  y[x-[temp1+†]temp1-temp0+y-]
  temp0[y+temp0-]q+temp1
 ]
]
x[y[temp0+x+y-]temp0[y+temp0-]q-†]
    */

    this.memoryPointerByName(x);
    this.result += "[";
    this.memoryPointerByName(y);
    this.result += "[";
    this.memoryPointerByName(temp0);
    this.result += "+";
    this.memoryPointerByName(x);
    this.result += "+";
    this.memoryPointerByName(y);
    this.result += "-";
    this.result += "]";
    this.memoryPointerByName(temp0);
    this.result += "[";
    this.memoryPointerByName(y);
    this.result += "+";
    this.memoryPointerByName(temp0);
    this.result += "-";
    this.result += "]";
    this.memoryPointerByName(q);
    this.result += "-";

    this.memoryPointerByName(nil);
    this.result += "[";
    this.result += "-";
    this.result += "]";

    this.result += "]";


    this.memoryFree(y, true, true);
    this.memoryFree(temp0, true, true);
    this.memoryFree(temp1, true, true);
    this.memoryFree(nil, true, true);

    this.memoryPointerByName(q);

    return q;
  }

  compile(node) {
    switch (node.type) {
      case "func":
        break;
      case "assign":
        console.log(`create var ${node.childs[0].type}(${node.childs[0].text}) ${node.childs[1].type}(${node.childs[1].text})`);

        if (node.childs[1].type === "plus") {
          this.compile(node.childs[1]);

          this.varCopyByIndex(node.childs[0].text, this.currentMemoryPointer);

          return;
        }
        if (node.childs[1].type === "div") {
          this.compile(node.childs[1]);

          this.varCopyByIndex(node.childs[0].text, this.currentMemoryPointer);

          return;
        }
        if (node.childs[1].type === "identifier") {
          this.varCopyByName(node.childs[0].text, node.childs[1].text);

          return;
        }

        let vari = node.childs[1].text;
        if (node.childs[1].type == "number") {
          vari = Number(vari);
        }
        this.varCreate(node.childs[0].text, vari);
        break;
      case "div":
        const first2 = node.childs[0];
        const second2 = node.childs[1];

        console.log(`div ${first2.type}(${first2.text}) / ${second2.type}(${second2.text})`);

        this.Division2(first2.text, second2.text)
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
          case "identifier":
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
          case "identifier":
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
        if (node.childs[0].type = Tokens.identifier) {
          let variable = this.variables[node.childs[0].text];
          if (variable.type == "string") {
            variable.memoryIndex.forEach(memoryIndex => {
              this.memoryPointerByIndex(memoryIndex);
              this.result += ".";
            });
          } else if (variable.type == "int8") {
            // const copyVar = `transpiler_temp_${this.getIotaSecureIndex()}`;
            // const copyAsciiVar = `transpiler_temp_ascii_${this.getIotaSecureIndex()}`;
            // this.varCopyByName(copyVar, node.childs[0].text)
            // this.memoryPointerByName(copyVar);
            // this.varCreate(copyAsciiVar, node.childs[0].text)
            // this.result += "[";
            // this.result += ".";
            // this.result += ".";
          }
          
        } else {
          // this.compile(child);
        }
        

        
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