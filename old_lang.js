'use strict';

document.querySelector("#convert_old").onclick = function () {
  var src = document.querySelector("#src_old").value;
  var bf = convert_old(src);
  document.querySelector("#bf_old").value = bf;
}

function convert_old(src) {
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

          if (variables[variable].type == "int8") {
            getMemoryFromIndex(variables[variable].memoryIndex);
            result += ".";
          } else if (variables[variable].type == "string") {
            for (let i = 0; i < variables[variable].memoryIndex.length; i++) {
              const e = variables[variable].memoryIndex[i];
              getMemoryFromIndex(e);
              result += ".";
            }
          }
        } else if (operators.length == 3 && operators[2] == "tostring") {
          console.log("test");
          const variable = operators[1];

          if (variables[variable].type == "int8") {
            getMemoryFromIndex(variables[variable].memoryIndex);

            const varIndex = `translator_for_index_line_${i + 1}`;
            createVar(varIndex, Number(48));
            var indexator = variables[varIndex];

            var copyName = createVarCopyPointersSafe(variable);
            var copy = variables[copyName];

            getMemoryFromIndex(indexator.memoryIndex);
            result += "[";
            result += "-";
            getMemoryFromIndex(copy.memoryIndex);
            result += "+";
            getMemoryFromIndex(indexator.memoryIndex);
            result += "]";
            getMemoryFromIndex(copy.memoryIndex);
            result += ".";

            deleteVar(varIndex);
            deleteVar(copyName);
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
        let index = stackPointers[stackPointers.length - 1];

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
        let index = stackPointers[stackPointers.length - 1];

        getMemoryFromIndex(index.ind);
        deleteVar(index.name);
        stackPointers.pop();
        result += "-";
        result += "]";
        break;
      }
      case "dump": {
        result += "#";
        break;
      }
      default: {
        return `Error: undefined ${operators[0]} operator in ${i + 1} line.`;
      }
    }
  }
  return result;
}