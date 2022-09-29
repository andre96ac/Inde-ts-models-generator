export enum ERROR_CODES{
    ERR_SAVING_MODEL_FILE = 0,
    ERR_READING_METADATA_FILE = 10,
    ERR_FETCHING_METADATA_URL = 20,
    ERR_PROCESSING_XML = 30,
}


export interface myError{
    error: Error,
    code: ERROR_CODES
}

export type INDE_TYPES = 
"Edm.Guid"      |//
"Edm.String"    |//
"Edm.Date"      |//
"Edm.DateTimeOffset" |//
"Edm.Decimal"   |//
"Edm.Binary"    |//
"Edm.Int32"     |//
"Edm.Int16"     ;//


export type TS_TYPES = 
"number"    |
"string"    |
"Date"      |
"boolean"   ;



export const INDE_TS_TYPES_MAP: Record<TS_TYPES, INDE_TYPES[]> = {
    string: ["Edm.String", "Edm.Guid"],
    number: ["Edm.Decimal", "Edm.Int16", "Edm.Int32"],
    boolean: ["Edm.Binary"],
    Date: ["Edm.Date", "Edm.DateTimeOffset"]
}
// export const INDE_TS_TYPES_MAP: Record<INDE_TYPES, TS_TYPES> = {
//     character: "string",
//     i16: "string",
//     i32: "string"
// }
export function converToTsType(indeType: INDE_TYPES): TS_TYPES | null{

    let finalType: TS_TYPES | null = null;
   let arTsTypes  = Object.keys(INDE_TS_TYPES_MAP) as TS_TYPES[];
   arTsTypes.forEach((key: TS_TYPES, idx, other) => {
    if(INDE_TS_TYPES_MAP[key].includes(indeType))
        finalType = key;
   })

   return finalType;
}

