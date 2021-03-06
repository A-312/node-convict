const chai = require('chai')
const expect = chai.expect

const new_require = require('./new_require.js')
const blueconfig = new_require('../')

describe('blueconfig getters', function() {
  let conf

  it('must have the default getters order', function() {
    const order = ['default', 'value', 'env', 'arg', 'force']
    expect(blueconfig.getGettersOrder()).to.be.deep.equal(order)
  })

  it('must add several getters with array', function() {
    const blueconfig = new_require('../')

    blueconfig.addGetters([
      { property: 'bird1', getter: () => {} }, // keep `property` key (alias of name) avoid a breakchange
      { name: 'bird2', getter: () => {} },
      { name: 'bird3', getter: () => {} }
    ])

    const goodOrder = ['default', 'value', 'env', 'arg', 'bird1', 'bird2', 'bird3', 'force']
    expect(blueconfig.getGettersOrder()).to.be.deep.equal(goodOrder)
  })

  it('must init and set custom getters', function() {
    blueconfig.addGetter({
      name: 'ghost',
      getter: (value, schema, stopPropagation) => {
        stopPropagation()
        return undefined
      }
    })

    blueconfig.addGetters({
      answer: {
        getter: (value, schema, stopPropagation) => 'Yes, you can.',
        usedOnlyOnce: true
      },
      answer_no: {
        getter: (value, schema, stopPropagation) => 'No, you cannot.'
      }
    })
  })

  it('must parse a schema with custom getters', function() {
    conf = blueconfig({
      plane: {
        default: 'foo',
        answer: 'Can I fly?'
      },
      bird: {
        default: 'foo',
        answer: 'Can I swim?',
        answer_no: 'Can I swim?'
      },
      ghost: {
        default: 'foo',
        format: (v) => {
          if (typeof v !== 'undefined') {
            throw new Error('not undefined')
          }
        },
        answer: 'Too scared to ask',
        answer_no: 'Too scared to ask',
        ghost: 'ooooh!'
      }
    })
  })

  it('must failed because custom getter order', function() {
    conf.merge({
      default: 'foo',
      plane: 'airbus'
    })
    expect(() => conf.validate()).to.throw('ghost: not undefined: value was "No, you cannot.", getter was `answer_no["Too scared to ask"]`')
  })

  const wrongOrder = ['default', 'value', 'env', 'arg', 'ghost', 'answer', 'answer_no', 'force']
  const perfectOrder = ['default', 'value', 'env', 'arg', 'answer', 'answer_no', 'ghost', 'force']

  it('must throw with an incorrect getter order', function() {
    expect(() => blueconfig.sortGetters('bad')).to.throw('Invalid argument: newOrder must be an array.')
    expect(() => blueconfig.sortGetters(['default', 'value', 'force', 'env'])).to.throw('Invalid order: force cannot be sorted')
    expect(() => blueconfig.sortGetters(['default', 'value', 'env', 'arg', 'ghost', 'answer'])).to.throw('Invalid order: a getter is missed: answer_no')
    expect(() => blueconfig.sortGetters(['default', 'env'])).to.throw('Invalid order: several getters are missed: value, arg, ghost, answer, answer_no')
    const wrongOrder = ['default', 'value', 'env', 'arg', 'ghost', 'answer', 'answer_no', 'charlie']
    expect(() => blueconfig.sortGetters(wrongOrder)).to.throw('Invalid order: unknown getter: charlie')
  })

  it('must change the current order', function() {
    expect(blueconfig.getGettersOrder()).to.be.deep.equal(wrongOrder)
    blueconfig.sortGetters(perfectOrder)
    expect(blueconfig.getGettersOrder()).to.be.deep.equal(perfectOrder)
    expect(conf.getGettersOrder()).to.be.deep.equal(wrongOrder)

    const testOrder = ['default', 'value', 'arg', 'env', 'ghost', 'answer', 'answer_no', 'force']
    conf.sortGetters(testOrder)

    expect(conf.getGettersOrder()).to.be.deep.equal(testOrder)
    expect(blueconfig.getGettersOrder()).to.be.deep.equal(perfectOrder)
  })

  it('must failed because custom getter order', function() {
    conf.merge({
      default: 'foo',
      plane: 'airbus'
    })
    expect(() => conf.validate()).to.throw('ghost: not undefined: value was "No, you cannot.", getter was `answer_no["Too scared to ask"]`')
  })

  it('must refresh getters and cached values', function() {
    expect(() => conf.refreshGetters()).to.not.throw()
  })

  it('must merge with custom getters', function() {
    conf.merge({
      default: 'foo',
      plane: 'airbus'
    })
  })

  it('validates conf', function() {
    expect(() => conf.validate()).to.not.throw()
  })

  it('plane can fly', function() {
    expect(conf.get('plane')).to.equal('Yes, you can.')
    expect(conf.getOrigin('plane')).to.equal('answer')
  })

  it('bird cannot swim', function() {
    expect(conf.get('bird')).to.equal('No, you cannot.')
    expect(conf.getOrigin('bird')).to.equal('answer_no')
  })

  it('getter are affraid of ghost !', function() {
    expect(conf.get('ghost')).to.be.undefined
    expect(conf.getOrigin('ghost')).to.equal('ghost')
  })

  it('must change origin', function() {
    conf.set('bird', 'ok')

    expect(conf.getOrigin('bird')).to.equal('value')
  })

  it('must not rewrite an existing getter', function() {
    const expected = 'Getter keyname "answer" is already registered. Set the 4th argument (rewrite) of `addGetter` at true to skip this error.'
    const getter = (value, schema, stopPropagation) => 'Yes, you can.'

    expect(() => blueconfig.addGetter('answer', getter)).to.throw(expected)
  })

  it('must accept only fonction', function() {
    const expected = 'Getter keyname must be a string (current: "undefined").'
    const str = 'not a function'

    expect(() => blueconfig.addGetter([], str)).to.throw(expected)
  })

  it('must accept only fonction', function() {
    const expected = 'Getter function for "bad" must be a function'
    const str = 'not a function'

    expect(() => blueconfig.addGetter('bad', str)).to.throw(expected)
  })

  it('must not accept getter keyname: value', function() {
    const expected = 'Getter keyname use a reservated word: value'

    expect(() => blueconfig.addGetter('value', (v) => v)).to.throw(expected)
  })

  it('must not accept getter keyname: force', function() {
    const expected = 'Getter keyname use a reservated word: force'

    expect(() => blueconfig.addGetter('force', (v) => v)).to.throw(expected)
  })

  it('getter with `usedOnlyOnce = true` must not have similar value', function() {
    const schema = {
      plane: {
        default: 'foo',
        answer: 'Can I fly?'
      },
      bird: {
        default: 'foo',
        answer: 'Can I fly?'
      }
    }
    expect(() => blueconfig(schema)).to.throw('bird: uses a already used getter keyname for "answer", current: `answer["Can I fly?"]`')
  })

  it('must not rewrite an existing getter because I ask to force', function() {
    const getter = (value, schema, stopPropagation) => 'Yes, you can.'
    const usedOnlyOnce = (value, schema, fullName, getterName) => {
      if (value !== 'Can I fly?') {
        throw new Error('Stop asking!')
      }
    }
    expect(() =>
      blueconfig.addGetter('answer', getter, usedOnlyOnce, true)
    ).to.not.throw()
  })

  it('can ask "Can I fly?" several time', function() {
    const schema = {
      plane: {
        default: 'foo',
        answer: 'Can I fly?'
      },
      bird: {
        default: 'foo',
        answer: 'Can I fly?'
      }
    }

    expect(() => blueconfig(schema)).to.not.throw()
  })

  it('cannot ask "Can I leave?" several time', function() {
    const schema = {
      plane: {
        default: 'foo',
        answer: 'Can I leave?'
      },
      bird: {
        default: 'foo',
        answer: 'Can I leave?'
      }
    }

    expect(() => blueconfig(schema)).to.throw('Stop asking!')
  })

  describe('test `conf.refreshGetters()`', function() {
    const blueconfig = new_require('../')
    let conf

    it('must have the default getters order', function() {
      const order = ['default', 'value', 'env', 'arg', 'force']
      expect(blueconfig.getGettersOrder()).to.be.deep.equal(order)
    })

    it('must init and parse schema', function() {
      const schema = {
        car: {
          format: 'String',
          default: 'Audi'
        },
        color: {
          format: 'String',
          default: 'green',
          env: 'COLOR'
        },
        city: {
          format: 'String',
          default: 'Paris',
          env: 'CITY'
        },
        food: {
          format: 'String',
          default: 'apple',
          arg: 'FOOD'
        },
        today: {
          format: 'String',
          default: 'no'
        }
      }
      const options = {
        env: {
          COLOR: 'blue',
          CITY: 'Okayama'
        },
        args: '--FOOD meat'
      }

      conf = blueconfig(schema, options)

      conf.merge({
        today: 'yes',
        unexpected: true
      })

      conf.set('color', 'green', true) // getter: 'force'
      conf.set('city', 'Tokyo') // getter: 'value'
      conf.set('car', 'Renault', 'env') // fake getter: 'env'

      conf.validate()
    })

    it('must be deep equal to expected object', function() {
      const table = {
        car: 'env',
        color: 'force',
        city: 'value', // will change because lower level than env.
        today: 'value'
      }

      Object.keys(table).forEach((key) =>
        expect(conf.getOrigin(key)).to.deep.equal(table[key])
      )

      const expectedProperties = {
        car: 'Renault',
        color: 'green',
        city: 'Tokyo',
        food: 'meat',
        today: 'yes',
        unexpected: true
      }

      expect(conf.getProperties()).to.deep.equal(expectedProperties)
    })

    it('must be deep equal to expected object after refresh', function() {
      const expectedProperties = {
        car: 'Renault',
        color: 'green',
        city: 'Okayama',
        food: 'meat',
        today: 'yes',
        unexpected: true
      }

      conf.refreshGetters()

      expect(conf.getProperties()).to.deep.equal(expectedProperties)
    })
  })
})
