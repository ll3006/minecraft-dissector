const dataPath = require("./minecraft-data/data/dataPaths.json")

const data = require(`./minecraft-data/data/${dataPath.pc["1.16.3"].protocol}/protocol.json`)
const assert = require("assert")

function indent(code, n = 2) {
  return code
    .split("\n")
    .map((line) => " ".repeat(n) + line)
    .join("\n")
}

function unsnake(s) {
  return s
    .split("_")
    .map((e) => e[0].toUpperCase() + e.slice(1).toLowerCase())
    .join(" ")
}

function uncamel(s) {
  return s
    .replace(/_\w/g, (m) => m[1].toUpperCase())
    .replace(/[A-Z0-9]{2,}/, (m) => m[0] + m.slice(1).toLowerCase())
    .split(/(?=[A-Z0-9])/)
    .map((e) => e[0].toUpperCase() + e.slice(1).toLowerCase())
    .join(" ")
}

class UnsupportedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsupportedError";
  }
}

function* generate_snippet(type, path, types, name, data, tree = "tree") {
  let field_info
  if (typeof type !== "string") field_info = type;
  else {
    if (!(type in types)) throw new UnsupportedError("Unknown type " + type)
    field_info = types[type];
  }

  if (typeof field_info === "function") yield* field_info({path, types, name, data, tree})
  else if (typeof field_info === "string") {
    if (field_info === "native") throw new UnsupportedError("Unknown native type " + type)
    yield* generate_snippet(field_info, path, types, name, data)
  }
  else if (Array.isArray(field_info))
    yield* generate_snippet(field_info[0], path, types, name, field_info[1])
  else throw new UnsupportedError("Invalid type " + type)
}

function merge_snippet(iterator) {
  let code = ""
  try {
    for (const item of iterator) {
      code += item.code + "\n"
    } 
  } catch (e) {
      if (!(e instanceof UnsupportedError)) throw e;
      code += `// [STUB]: ${e.message}\n`
    }
  return code.trim();
}


const natives = {
  *container({path, types, data, tree}) {
      for (let item of data) {
        const new_path = `${path}_${item.name}`        
        yield* generate_snippet(item.type, new_path, types, item.name, tree)
      }
    },
  *varint({path, name, tree}) {
    const hf_type =  "FT_UINT32"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_varint(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
      return_type: "guint32"
    }
  },
  *string({path, name, tree}) {
    const hf_type =  "FT_STRING"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_string(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
    }
  },
  *bool({path, name, tree}) {
    const hf_type =  "FT_BOOLEAN"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_bool(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
    }
  },
  *u8({path, name, tree}) {
    const hf_type =  "FT_UINT8"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_u8(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
    }
  },
  *i8({path, name, tree}) {
    const hf_type =  "FT_INT8"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_i8(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
    }
  },
  *u16({path, name, tree}) {
    const hf_type =  "FT_UINT16"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_u16(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
    }
  },
  *i16({path, name, tree}) {
    const hf_type =  "FT_INT16"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_i16(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
    }
  },
  *i32({path, name, tree}) {
    const hf_type =  "FT_INT32"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_i32(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
    }
  },
  *i64({path, name, tree}) {
    const hf_type =  "FT_INT64"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_i64(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
    }
  },
  *f32({path, name, tree}) {
    const hf_type =  "FT_FLOAT"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_f32(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
    }
  },
  *f64({path, name, tree}) {
    const hf_type =  "FT_DOUBLE"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_f64(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
    }
  },
  *UUID({path, name, tree}) {
    const hf_type =  "FT_BYTES"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_UUID(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
    }
  },
  *restBuffer({path, name, tree}) {
    const hf_type =  "FT_BYTES"
    hf.push({ name, path, type: hf_type})
    yield {
      code: `minecraft_add_restbuffer(${tree}, hf_${path}, tvb, &offset);`,
      hf_type,
    }
  },
  *buffer({path, name, data, types, tree}) {
    if (data.countType === undefined) throw new UnsupportedError("Unknown buffer with countType not defined")
    const iterator = generate_snippet(data.countType,`${path}_len`, types, name ? `${name}Length` : 'Length', undefined, tree)
    const count = iterator.next().value
    
    const hf_type = "FT_BYTES"
    hf.push({name, path, type: hf_type })
    
    yield {
      code: `${count.return_type} ${path}_len = ${count.code}
minecraft_add_buffer(${tree}, hf_${path}, tvb, &offset, ${path}_len);`,
      hf_type
    }
  },
  *option({path, name, data, types, tree}) {
    let iterator = generate_snippet(data, path, types, name, undefined, tree)
    let inner = iterator.next().value;
    let code = `if (tvb_get_guint8(tvb, offset) == 1) {
  offset += 1;
`
    code += indent(inner.code, 2)
    let snippet = merge_snippet(iterator)
    if (snippet) code += "\n" + indent(snippet, 2)
    code += `
}`
    yield {
      code,
      hf_type: inner.hf_type,
    }
  },
}

const functions = []
const hf = []

function types_from_namespace(namespace) {
  const types = {}
  
  const res = namespace.reduce((c, v) => {
    if (c.types) {
      Object.assign(types, c.types)
    }
    return c[v]
  }, data)

  if (res.types) {
    Object.assign(types, res.types)
  }

  Object.assign(types, natives)
  return types
}

function generate(namespace) {
  const TYPES = types_from_namespace(namespace)
  const { packet } = TYPES

  assert(Array.isArray(packet) && packet.length == 2)
  assert(packet[0] === "container")
  assert(packet[1][0].name === "name" && packet[1][0].type[0] === "mapper")
  assert(packet[1][1].name === "params" && packet[1][1].type[0] === "switch")
  assert(packet[1][0].type[1].type === "varint")

  const names = packet[1][0].type[1].mappings
  const names_to_types = packet[1][1].type[1].fields

  const path = namespace.join("_")

  let code = `void ${path}(guint32 packet_id, tvbuff_t *tvb, packet_info *pinfo, proto_tree *tree, guint offset, guint32 len) {
  switch (packet_id) {
`
  for (const [id, name] of Object.entries(names) ) {
    code += indent(`case ${id}:
  col_set_str(pinfo->cinfo, COL_INFO, "${unsnake(name)} [${namespace[0]}] (${namespace[1]})");`,4)
    code += "\n"
    let snippet = merge_snippet(generate_snippet(names_to_types[name], `${path}_${name}`, TYPES, name))
    if (snippet) code += `${indent(snippet,6)}\n`
    code += indent(`break;`,6)
    code += "\n"
  }
  code += `${indent(`}`)}
}`
  functions.push(code)
}

generate(["handshaking", "toServer"])
generate(["handshaking", "toClient"])

generate(["status", "toServer"])
generate(["status", "toClient"])

generate(["login", "toServer"])
generate(["login", "toClient"])

generate(["play", "toServer"])
generate(["play", "toClient"])

const NONE_TYPES = ["FT_STRING", "FT_BYTES", "FT_FLOAT", "FT_DOUBLE", "FT_NONE"]

console.log(
`${(hf.map(({ path }) => `static int hf_${path} = -1;`).join("\n"))}

static hf_register_info hf_generated[] = {
${indent(
  hf
    .map(({ name, path, type }) => {
      return `{ &hf_${path},
  { "${uncamel(name)}", "minecraft.${path.replace(/_/g, ".")}", ${type}, ${
      NONE_TYPES.includes(type)  ? "BASE_NONE" : "BASE_DEC"
      }, NULL,
    0x0, "${uncamel(name)}", HFILL }},`
    })
    .join("\n\n")
)}
};

${functions.join("\n\n")}
`)