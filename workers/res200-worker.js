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

      // 원본 Request 객체를 기반으로 새 Request 객체 생성
      // URL과 헤더를 변경하고, 메서드 및 본문은 원본 Request에서 상속
      const proxiedRequest = new Request(request, {
        url: initialUrl, // 프록시할 최종 URL
        headers: newHeaders, // 수정된 헤더 (Host 포함)
      });

      const response = await fetch(proxiedRequest, { // 수정된 Request 객체로 fetch 호출
        redirect: "follow", // 중요: 리디렉션을 자동으로 따라감
      });

      // 응답 코드가 400 이상이면 JSON으로 400 ERROR 응답
      if (response.status >= 400) {
        return new Response(JSON.stringify({ error: "400 ERROR", status: response.status }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return response; // 정상 응답 반환

    } catch (error) {
      console.error("Error fetching initial URL:", error);
      return new Response("Internal Server Error", { status: 500 }); // 오류 메시지 정리
    }
  },
};
