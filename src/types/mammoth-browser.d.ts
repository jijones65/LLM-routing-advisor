declare module "mammoth/mammoth.browser.js" {
  interface Result {
    readonly value: string;
    readonly messages: readonly { readonly type: string; readonly message: string }[];
  }

  const mammoth: {
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<Result>;
  };

  export default mammoth;
}
