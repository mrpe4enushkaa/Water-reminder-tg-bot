import { translate } from "@vitalets/google-translate-api";
import { TranslateOptions } from "./translate.interface";

export class TranslateService implements TranslateOptions {
    public async translate(text: string): Promise<string> {
        return (await translate(text, { to: "en" })).text;
    }
}