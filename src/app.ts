import axios from "axios"
import {parseStringPromise} from "xml2js"
import {writeFile} from 'fs/promises'
import { ClassGenerator } from "./class-generator.js"

const MYURL = 'https://speedyweb.islashipweb.com/$metadata'

// axios.get(MYURL)
// .then((res) => {
//     console.log(res.data)
//     return parseStringPromise(res.data);
// })
// .then((result) => {
//     console.log(result)
//     writeFile('./pippo.json', JSON.stringify(result))
// })
// .catch(console.log)


const myClass = new ClassGenerator();
myClass.setName('utenteBelloMaNonTroppo');
myClass.addProperty('name', 'string', true);
myClass.addProperty('age', 'number', false);
myClass.addProperty('surname', 'string', true, true);
myClass.addProperty('birthday', 'Date', true, true);
myClass.saveOnFileSystem('./tests');