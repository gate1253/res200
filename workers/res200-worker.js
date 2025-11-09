export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetBaseUrl = env.TARGET_URL;
    
    // TARGET_URL이 슬래시로 끝나지 않으면 추가
    const initialUrl = targetBaseUrl.endsWith('/') 
      ? `${targetBaseUrl}${url.pathname.substring(1)}${url.search}`
      : `${targetBaseUrl}${url.pathname}${url.search}`;

    try {
      // 원본 요청 헤더를 복사하고 Host 헤더를 targetBaseUrl의 호스트로 설정
      const newHeaders = new Headers(request.headers);
      const targetHost = new URL(targetBaseUrl).host;
      newHeaders.set('Host', targetHost);

      // 원본 Request 객체를 기반으로 새 Request 객체 생성 (초기 프록시 요청)
      const proxiedRequest = new Request(initialUrl, {
        method: request.method,
        headers: newHeaders, // 수정된 헤더 (Host 포함)
        body: request.body, // 원본 요청 본문 전달 (GET/HEAD 요청에는 null)
      });

      // 첫 번째 fetch 호출 (리디렉션을 수동으로 처리)
      let response = await fetch(proxiedRequest, {
        redirect: "manual", // 중요: 리디렉션을 자동으로 따라가지 않음
      });

      // --- 디버깅을 위한 임시 로직 시작 ---
      // 만약 3xx 리디렉션 응답을 받았다면, 해당 응답 정보를 JSON으로 반환하여 디버깅
      if (response.status >= 300 && response.status < 400) {
        const debugRedirectInfo = {
          message: "Received a redirect response (3xx)",
          initialUrl: initialUrl,
          proxiedRequest: {
            url: proxiedRequest.url,
            method: proxiedRequest.method,
            headers: Object.fromEntries(proxiedRequest.headers.entries()),
          },
          redirectResponse: {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            location: response.headers.get('Location'),
            headers: Object.fromEntries(response.headers.entries()),
          }
        };
        return new Response(JSON.stringify(debugRedirectInfo, null, 2), {
          status: 200, // 디버깅 응답 자체는 200으로 반환
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // --- 디버깅을 위한 임시 로직 끝 ---

      // 응답 코드가 400 이상이면 JSON으로 400 ERROR 응답
      if (response.status >= 400) {
        return new Response(JSON.stringify({ error: "400 ERROR", status: response.status }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return response; // 최종 응답 반환 (리디렉션이 없거나 400 미만인 경우)

    } catch (error) {
      console.error("Error fetching initial URL:", error);
      return new Response("Internal Server Error", { status: 500 }); // 오류 메시지 정리
    }
  },
};
