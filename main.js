var buttonConvert = document.querySelector("#convert").onclick = function () {
  var src = document.querySelector("#src").value;
  var bf = convert(src);
  document.querySelector("#bf").value = bf;
}
function convert(src) {
  var lines = src.split("\n");
  var result = "";

  var variables = {};
  var memory = {};
  var currentOperator = 0;
  var currentMemoryPointer = 0;

  var getEmptySlot = () => {
    const len = Object.keys(memory).length;
    for (let i = 0; i < len; i++) {
      if (!(i in memory)) {
        return i;
      }
    }
    return len;
  }
  var moveToMemory = (to) => {
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
    const slot = getEmptySlot();

    variables[key] = {
      slot: slot,
      value: value,
      type: "number"
    };
    memory[slot] = value;

    moveToMemory(slot);
    writeToMemoryOptimized(value);
  }
  var createVarString = (key, value) => {
    var slots = [];
    for (let i = 0; i < value.length; i++) {
      var slot = getEmptySlot();
      slots.push(slot);
      memory[slot] = value[i];
    }

    variables[key] = {
      slot: slots,
      value: value,
      type: "string"
    };

    for (let i = 0; i < value.length; i++) {
      moveToMemory(slots[i]);
      writeToMemoryOptimized(value.charCodeAt(i));
    }
  }
  var writeToMemoryOptimized = (value) => {
    var quotient = Math.floor(value / 10);
    var remainder = value % 10;

    const slotBefore = currentMemoryPointer;
    const slot = getEmptySlot();
    moveToMemory(slot);
    for (let i = 0; i < quotient; i++) {
      result += "+"
    }
    result += "["
    result += "-"
    moveToMemory(slotBefore);
    for (let i = 0; i < 10; i++) {
      result += "+"
    }
    moveToMemory(slot);
    result += "]"
    moveToMemory(slotBefore);
    for (let i = 0; i < remainder; i++) {
      result += "+"
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line == "") {
      continue;
    }
    var operators = line.split(" ");

    if (operators.length < 1) {
      return `Error: empty zero operator in ${i + 1} line.`;
    }

    switch (operators[0]) {
      case "var":
        if (operators.length == 2) {
          createVar(operators[1], 0)
        } else if (operators.length == 3) {
          if (!isNaN(operators[2])) {
            createVar(operators[1], operators[2])
          } else {
            createVarString(operators[1], operators[2])
          }
        }
        break;
      case "add":
        if (operators.length == 3) {
          const variable = variables[operators[1]];
          const variableAdd = variables[operators[2]];

          if (variable.type != variableAdd.type) {
            return `Error: different types on ${i + 1} line.`;
          }

          const variableTemp = `translator_temp_line_${i + 1}`;
          createVar(variableTemp, variableAdd.value)

          variable.value += variableAdd.value;
          memory[variable.slot] = variable.value;

          var indexSlot = variables[variableTemp].slot;
          moveToMemory(indexSlot);
          result += "[";
          result += "-";
          moveToMemory(variable.slot);
          result += "+";
          moveToMemory(indexSlot);
          result += "]";
          delete variables[variableTemp];
        }
        break;
      case "out":
        if (operators.length == 2) {
          const variable = operators[1];

          if (variables[variable].type == "number") {
            moveToMemory(variables[variable].slot);
            result += ".";
          } else if (variables[variable].type == "string") {
            for (let i = 0; i < variables[variable].slot.length; i++) {
              const e = variables[variable].slot[i];
              moveToMemory(e);
              result += ".";
            }
          }
        }
        break;

      default:
        return `Error: undifined zero operator in ${i + 1} line.`;
        break;
    }
  }
  return result;
}