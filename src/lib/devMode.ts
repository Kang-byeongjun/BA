/**
 * 개발자용 화면(앱 설정·보정 이력·전체 데이터 초기화)을 보일지: 주소에 ?dev=1이 있을 때만 true.
 * search를 직접 넘기면(테스트용) window를 읽지 않는다.
 */
export function isDevMode(search: string = typeof window === 'undefined' ? '' : window.location.search): boolean {
  return new URLSearchParams(search).get('dev') === '1'
}
