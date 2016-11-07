# Convert Mocha and Chai to Jest

```sh
$ jscodeshift <path> -t chai-assert-to-expect.js
$ jscodeshift <path> -t mocha-to-jest.js
```

## TODO

### Assertions

- [ ] typeOf
- [ ] notTypeOf
- [ ] property
- [ ] notProperty
- [ ] deepProperty
- [ ] notDeepProperty
- [ ] propertyVal
- [ ] propertyNotVal
- [ ] deepPropertyVal
- [ ] deepPropertyNotVal
- [ ] lengthOf
- [ ] operator
- [ ] closeTo
- [ ] approximately
- [ ] sameMembers
- [ ] sameDeepMembers
- [ ] includeMembers
- [ ] includeDeepMembers
- [ ] oneOf
- [ ] changes
- [ ] doesNotChange
- [ ] increases
- [ ] doesNotIncrease
- [ ] decreases
- [ ] doesNotDecrease
- [ ] ifError
- [ ] isExtensible
- [ ] isNotExtensible
- [ ] isSealed
- [ ] isNotSealed
- [ ] isFrozen
- [ ] isNotFrozen

### Special Cases

- [ ] [chai-as-promised](https://github.com/domenic/chai-as-promised)
