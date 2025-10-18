# idl-smoketest

Automated smoke tester for the [Industry Documents Library](https://industrydocuments.ucsf.edu/)

## Usage

To test against your own dev instance running on localhost port 4173:

```
npx idl-smoketest
```

If you need a different URL, set the environment variable `IDL_URL`.

```
IDL_URL=https://example.com/ npx idl-smoketest
```

## License

This software is licensed under the MIT License. See the LICENSE file for
details.
