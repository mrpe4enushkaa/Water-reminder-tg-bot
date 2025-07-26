export interface TranslateOptions {
    translate(text: string): Promise<string>;
}