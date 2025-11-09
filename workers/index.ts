export interface Env {
  // 여기에 바인딩을 추가하세요 (예: KV, R2, Durable Objects)
  // MY_VARIABLE: string;
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  // MY_BUCKET: R2Bucket;
  TARGET_URL: string; // 추가: 리디렉션 대상 URL
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const targetBaseUrl = env.TARGET_URL;
    
    // TARGET_URL이 슬래시로 끝나지 않으면 추가
    const initialUrl = targetBaseUrl.endsWith('/') 
      ? `${targetBaseUrl}${url.pathname.substring(1)}${url.search}`
      : `${targetBaseUrl}${url.pathname}${url.search}`;

    try {
      // 원본 요청의 메서드, 헤더, 본문을 포함하여 fetch 호출
      const response = await fetch(initialUrl, {
        method: request.method, // 원본 요청 메서드 전달
        headers: request.headers, // 원본 요청 헤더 전달
        body: request.body, // 원본 요청 본문 전달 (GET/HEAD 요청에는 null)
        redirect: "follow", // 중요: 리디렉션을 자동으로 따라감
      });
      return response;
    } catch (error) {
      console.error("Error fetching initial URL:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
