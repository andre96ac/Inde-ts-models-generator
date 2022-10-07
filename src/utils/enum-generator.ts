import { TS_TYPES } from "./various";

export class EnumFileGenerator{

    arEnums: EnumDescriptor[] = [];




    /**
     * Elimina tutta la parte prima del punto, e mette il nome tutto maiuscolo
     * @param indeName nome enuma in arrivo da inde
     */
    static getTsNameFromIndeName(indeName: string): string{

        const tokens = indeName.split('.');
        return tokens[tokens.length - 1]?.toUpperCase();

    }


}

export interface EnumDescriptor{
    name: string;
    arProperties: EnumPropertyDescriptor[];
}

export interface EnumPropertyDescriptor{
    name: string;
    type: TS_TYPES
}

