#dasBaum

A simple jquery ui widget supporting drag & drop, inline renaming, keyboard navigation, and other cool stuff.

##Demo
To try it out, just click [here](http://www.mkleinhans.de/github/dasBaum/examples/simple.html)

##Example
To build a simple tree, just run the following code snippet (assuming you have an element #divId)
```javascript
$('#divId').dasBaum({
	items: [
		{
			label:'Folder',
			items: [{label:'Nested Entry'}]
		},
		{label:'Entry'},
		{label:'Entry'},
		{label:'Entry'},
	]
});
```

