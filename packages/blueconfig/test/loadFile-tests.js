const chai = require('chai')
const expect = chai.expect

const path = require('path')
const json5 = require('json5')
const yaml = require('js-yaml')
const toml = require('toml')

const new_require = require('./new_require.js')
const blueconfig = new_require('../')

describe('blueconfig merge & addParser functions', function() {
  const schema = require('./fixtures/schema')
  const expected_output = require('./fixtures/out')

  describe('blueconfig()', function() {
    it('must init worker', function() {
      const Blueconfig = require('../lib/core.js')
      const blueconfig = new Blueconfig()

      expect(blueconfig.Getter).to.be.an('object')
      expect(blueconfig.Parser).to.be.an('object')
      expect(blueconfig.Ruler).to.be.an('object')
    })
  })

  describe('.addParser()', function() {
    it('must not throw on valid parser', function() {
      const parser1 = {
        extension: 'json',
        parse: JSON.parse
      }
      const parser2 = {
        extension: ['yml', 'yaml'],
        parse: yaml.safeLoad
      }

      expect(() => blueconfig.addParser(parser1)).to.not.throw()
      expect(() => blueconfig.addParser(parser2)).to.not.throw()
    })

    it('must not throw on valid array of parsers', function() {
      const parsers = [
        { extension: 'json', parse: JSON.parse },
        { extension: ['yml', 'yaml'], parse: yaml.safeLoad }
      ]

      expect(() => blueconfig.addParser(parsers)).to.not.throw()
    })

    it('must throw on invalid parser', function() {
      expect(() => blueconfig.addParser(undefined)).to.throw('Invalid parser')
      expect(() => blueconfig.addParser(null)).to.throw('Invalid parser')

      const parsers = [
        undefined, // Invalid parser
        { extension: 'json' }, // Missing parse function
        { extension: 'json', parse: 100 } // Invalid parse function
      ]
      // Must throw on the first key
      expect(() => blueconfig.addParser(parsers)).to.throw('Invalid parser')
    })

    it('must throw on invalid parser that is missing extension', function() {
      const parser = {
        parse: JSON.parse
      }
      expect(() => blueconfig.addParser(parser)).to.throw('Missing parser.extension')
    })

    it('must throw on invalid parser that has invalid extension', function() {
      const parser1 = {
        extension: 100,
        parse: JSON.parse
      }
      const parser2 = {
        extension: ['yml', 100],
        parse: yaml.parse
      }

      expect(() => blueconfig.addParser(parser1)).to.throw('Invalid parser.extension')
      expect(() => blueconfig.addParser(parser2)).to.throw('Invalid parser.extension')
    })

    it('must throw on invalid parser that is missing parse function', function() {
      const parser = {
        extension: 'json'
      }
      expect(() => blueconfig.addParser(parser)).to.throw('Missing parser.parse function')
    })

    it('must throw on invalid parser that has invalid parse function', function() {
      const parser = {
        extension: 'json',
        parse: 100
      }
      expect(() => blueconfig.addParser(parser)).to.throw('Invalid parser.parse function')
    })
  })

  describe('blueconfig().merge()', function() {
    it('must work using default json parser if format isn\'t supported', function() {
      const conf = blueconfig(schema)
      conf.merge(path.join(__dirname, 'fixtures/formats/data'))

      expect(() => conf.validate()).to.not.throw()
      expect(conf.get()).to.deep.equal(expected_output)
    })

    it('must work with custom json parser', function() {
      blueconfig.addParser({ extension: 'json', parse: JSON.parse })

      const conf = blueconfig(schema)
      conf.merge(path.join(__dirname, 'fixtures/formats/data.json'))

      expect(() => conf.validate()).to.not.throw()
      expect(conf.get()).to.deep.equal(expected_output)
    })

    it('must work with custom json parser and loadFile (`.loadFile(filepath)` is currently deprecated but not removed)', function() {
      blueconfig.addParser({ extension: 'json', parse: JSON.parse })

      const conf = blueconfig(schema)
      conf.loadFile(path.join(__dirname, 'fixtures/formats/data.json'))

      expect(() => conf.validate()).to.not.throw()
      expect(conf.get()).to.deep.equal(expected_output)

      conf.loadFile([
        path.join(__dirname, 'fixtures/formats/data.json'),
        path.join(__dirname, 'fixtures/empty.json')
      ])

      expect(() => conf.validate()).to.not.throw()
      expect(conf.get()).to.deep.equal(expected_output)
    })

    it('must work with custom json5 parser', function() {
      blueconfig.addParser({ extension: 'json5', parse: json5.parse })

      const conf = blueconfig(schema)
      conf.merge(path.join(__dirname, 'fixtures/formats/data.json5'))

      expect(() => conf.validate()).to.not.throw()
      expect(conf.get()).to.deep.equal(expected_output)
    })

    it('must work with custom yaml parser', function() {
      blueconfig.addParser({ extension: ['yml', 'yaml'], parse: yaml.safeLoad })

      const conf = blueconfig(schema)
      conf.merge(path.join(__dirname, 'fixtures/formats/data.yaml'))

      expect(() => conf.validate()).to.not.throw()
      expect(conf.get()).to.deep.equal(expected_output)
    })

    it('must work with custom toml parser', function() {
      blueconfig.addParser({ extension: 'toml', parse: toml.parse })

      const conf = blueconfig(schema)
      conf.merge(path.join(__dirname, 'fixtures/formats/data.toml'))

      expect(() => conf.validate()).to.not.throw()
      expect(conf.get()).to.deep.equal(expected_output)
    })

    it('must use wildcard parser if no parser is registered for extension', function() {
      const filepath = path.join(__dirname, 'fixtures/formats/data.xml')
      const message = 'Unsupported file type'
      blueconfig.addParser({ extension: '*', parse: function() { throw new Error(message) } })
      const conf = blueconfig(schema)

      expect(() => conf.merge(filepath)).to.throw(message)
    })

    it('must not break when parsing an empty file', function() {
      blueconfig.addParser({ extension: ['yml', 'yaml'], parse: yaml.safeLoad })

      const conf = blueconfig(schema)
      conf.merge(path.join(__dirname, 'fixtures/formats/data.empty.yaml'))

      expect(() => conf.validate()).to.not.throw()
    })
  })
})
