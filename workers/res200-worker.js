export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetBaseUrl = "https://buly.kr"; //env.TARGET_URL; // 환경 변수 사용으로 되돌림
    
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
      // initialUrl을 사용하고, 원본 요청의 method, headers, body를 명시적으로 전달
      const proxiedRequest = new Request(initialUrl, {
        method: request.method, // 원본 요청 메서드 전달
        headers: newHeaders, // 수정된 헤더 (Host 포함)
        body: request.body, // 원본 요청 본문 전달 (GET/HEAD 요청에는 null)
      });

      // 첫 번째 fetch 호출 (리디렉션을 수동으로 처리)
      let response = await fetch(proxiedRequest, {
        redirect: "follow", // 중요: 리디렉션을 자동으로 따라가지 않음
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
        // 4xx/5xx 응답에 대한 상세 디버깅 정보 추가
        const debugErrorResponse = {
          error: "Received an error response (4xx/5xx)",
          initialUrl: initialUrl,
          proxiedRequest: {
            url: proxiedRequest.url,
            method: proxiedRequest.method,
            headers: Object.fromEntries(proxiedRequest.headers.entries()),
          },
          errorResponse: {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            headers: Object.fromEntries(response.headers.entries()),
            // 본문은 스트림이므로 직접 포함하기 어려움. 필요시 response.text() 등으로 비동기 처리 필요.
          }
        };
        return new Response(JSON.stringify(debugErrorResponse, null, 2), {
          status: response.status, // 실제 오류 상태 코드 반환
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
