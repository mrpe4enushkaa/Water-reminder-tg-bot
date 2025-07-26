export interface TranslateOptions {
    translation(text: string): Promise<string>;
}