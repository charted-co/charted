import sha1 from "./sha1"

export function testSHA1(test) {
  test.equal('a9993e364706816aba3e25717850c26c9cd0d89d', sha1('abc'))
  test.equal('d271a54bb67c1af0ad791924e986cb2ec431f556', sha1('charted'))
  test.equal('a9993e3', sha1('abc', /* short */ true))
  test.equal('d271a54', sha1('charted', /* short */ true))
  test.done()
}
