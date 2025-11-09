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

      request.url = initialUrl; // 디버깅을 위해 URL 설정

      // 원본 Request 객체를 기반으로 새 Request 객체 생성 (초기 프록시 요청)
      const proxiedRequest = new Request(request, {
        url: initialUrl, // 프록시할 최종 URL
        headers: newHeaders, // 수정된 헤더 (Host 포함)
      });

      // 첫 번째 fetch 호출 (리디렉션을 수동으로 처리)
      let response = await fetch(proxiedRequest, { // fetch 호출 활성화
        redirect: "manual", // 중요: 리디렉션을 자동으로 따라가지 않음
      });

      // proxiedRequest 및 response의 디버깅 정보를 JSON으로 출력
      const debugInfo = {
        proxiedRequest: {
          url: proxiedRequest.url,
          method: proxiedRequest.method,
          headers: Object.fromEntries(proxiedRequest.headers.entries()),
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          redirected: response.redirected,
          headers: Object.fromEntries(response.headers.entries()),
        }
      };

      return new Response(JSON.stringify(debugInfo, null, 2), { // 가독성을 위해 null, 2 추가
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      // 응답 코드가 300-399 범위의 리디렉션인지 확인
    //   if (response.status >= 300 && response.status < 400) {
    //     const location = response.headers.get('Location');
    //     if (location) {
    //       // 상대 경로를 initialUrl 기준으로 해석하여 절대 URL 생성
    //       const redirectUrl = new URL(location, initialUrl);

    //       // 리디렉션 요청을 위한 새 헤더 생성 (Host 업데이트)
    //       const redirectHeaders = new Headers(request.headers); // 원본 헤더에서 시작
    //       redirectHeaders.set('Host', redirectUrl.host); // 리디렉션 대상의 호스트로 Host 헤더 설정

    //       // 리디렉션 유형에 따라 메서드와 본문 처리 (브라우저 동작 모방)
    //       let redirectMethod = request.method;
    //       let redirectBody = request.body;

    //       // 301, 302, 303 리디렉션의 경우, POST 요청은 GET으로 변경되고 본문은 제거됨
    //       if ((response.status === 301 || response.status === 302 || response.status === 303) && request.method === 'POST') {
    //         redirectMethod = 'GET';
    //         redirectBody = null; // 본문 제거
    //       }
    //       // 307, 308 리디렉션은 메서드와 본문을 유지

    //       // 리디렉션된 URL로 보낼 새 Request 객체 생성
    //       const redirectProxiedRequest = new Request(request, {
    //         url: redirectUrl.toString(),
    //         method: redirectMethod,
    //         headers: redirectHeaders,
    //         body: redirectBody,
    //       });

    //       // 리디렉션된 URL로 다시 fetch 호출 (이 요청은 최종 응답을 반환해야 함)
    //       response = await fetch(redirectProxiedRequest, {
    //         redirect: "manual", // 두 번째 요청도 수동으로 처리 (추가 리디렉션 방지)
    //       });
    //     }
    //   }

    //   // 응답 코드가 400 이상이면 JSON으로 400 ERROR 응답
    //   if (response.status >= 400) {
    //     return new Response(JSON.stringify({ error: "400 ERROR", status: response.status }), {
    //       status: response.status,
    //       headers: { 'Content-Type': 'application/json' },
    //     });
    //   }
      
    //   return response; // 최종 응답 반환

    } catch (error) {
      console.error("Error fetching initial URL:", error);
      return new Response("Internal Server Error", { status: 500 }); // 오류 메시지 정리
    }
  },
};
