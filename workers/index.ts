export interface Env {
  // 여기에 바인딩을 추가하세요 (예: KV, R2, Durable Objects)
  // MY_VARIABLE: string;
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  // MY_BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response("Hello from res200-worker!");
  },
};
