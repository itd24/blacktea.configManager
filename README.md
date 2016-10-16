#blacktea.configManager
A configuration manager able to manage configurations inside json files.
##Overview
* [Installation](#installation)
* [Usage](#usage)
* [Documentation](#documentation)
* [License](#license)

##Installation
Install it via the npm command:<br/>
`npm install blacktea.configManager --save`<br/>
##Usage
For the library to work, you need to add a configuration path to your *package.json* file:<br/>
`"configurationDirectory":"Config"`<br/>
In the above example we set /Config as the configuration directory.<br/><br/>
Now load the library:<br/>
`var configuration = require("blacktea.configManager");`<br/><br/>
Suppose you have a json file called `./Config/subdir/test.json` with the following content:<br/>
```
{
    "path":{
        "to":{
            "value":"testingValue"
        }
    }
}
```
reading a configuration is as simple as:<br/>
`var someValue = configuration.get("subdir/test","/path/to/value");`<br/>
In the above example you read the value "testingValue". <br/><br/>
Setting a value is just as simple:<br/>
`configuration.set("subdir/test","path/to/new/value",{new:"value"})`<br/>
Now you have a json file which looks like this:<br/>
```
{
    "path":{
        "to":{
            "value":"testingValue",
            "new":{
                "value":{
                    "new":"value"
                }
            }
        }
    }
}
```
<br/><br/>
If you want to delete a value:<br/>
`configuration.delete("subdir/test","/path/to/value");`<br/>
The resulting json file looks like this:<br/>
```
{
    "path":{
        "to":{
            "new":{
                "value":{
                    "new":"value"
                }
            }
        }
    }
}
```
<br/><br/>
You can also merge values:<br/>
`configuration.merge("subdir/test","path/to/new/value",{another:["a","b","c"]});`
<br/>
And you get:<br/>
```
{
    "path":{
        "to":{
            "new":{
                "value":{
                    "new":"value",
                    "another":["a","b","c"]
                }
            }
        }
    }
}
```
<br/><br/>
Accessing array values is also possible:<br/>
`var arrayValue = configuration.get("subdir/test","/path/to/new/value/another[1]");`
<br/>
will get you the value `"b"`<br/></br>
The library also supports some useful methods like push/pop or append/shift. All are described in detail in dhe **documentation** section.<br/><br/>
The library supports a simple *forEach* method, which goes through all elements of a configuration json value and executes a callback. The value can be either an object or array. If it is neither, the callback will execute only once on the json value itself:<br/>
```
configuration.forEach("subdir/test","path/to/new/value/another",function(value,key,configurationPath){
    console.log("the value is: "+value);
    console.log("the key is: "+key);
    console.log("the configuration path is: "+configurationPath);
});
```
<br/>
Would yield the following result:<br/>
```
the value is: a
the key is: 0
the configuration path is: path/to/new/value/another[0]
the value is: b
the key is: 1
the configuration path is: path/to/new/value/another[1]
the value is: c
the key is: 2
the configuration path is: path/to/new/value/another[2]
```
<br/><br/>The call:<br/>
```
configuration.forEach("subdir/test","path/to/new/value/new",function(value,key,configurationPath){
    console.log("the value is: "+value);
    console.log("the key is: "+key);
    console.log("the configuration path is: "+configurationPath);
});
```
<br/>
Would output the following:<br/>
```
the value is: value
the key is: new
the configuration path is: path/to/new/value/new
```
<br/>

This module uses the json-templating library [blacktea.jsonTemplates](https://github.com/itd24/blacktea.jsonTemplates), which means it supports basic template strings. It injects a helper with its own functions into the jsonTemplates library and thus you can make a few very nice things.
<br/>
Assuming our *test.json* file would have the following content:<br/>
```
{
    "key1":"{{config.get('subdir/test','key3')}}",
    "key2":10,
    "key3":"{{config.get('subdir/test','key2')}}"
}
```
<br/>
The result of this call:<br/>
`var someValue = configuration.get("subdir/test","key1");`
<br/>
Would be 10, since key1 is pointing to key3 and key3 is pointing to key2, which has a value of 10. The above example is just a demonstration, in practice you can do much more useful things.<br/><br/>
The functions exposed to the templating library are:
- get
- getOrDefault
- shift
- pop
- packageJson
<br/><br/>
This module was made by using the exceptional library [node-json-db](https://github.com/Belphemur/node-json-db)
##Documentation
-***get(configPath, jsonPath)***<br/>
gets a configuration value. Throws an exception if the value doesn't exist.<br/>
***configPath*** - the path of the configuration file<br/>
***jsonPath*** - the path to the value inside of the configuration file<br/>
<br/>
-***getOrDefault(configPath, jsonPath, defaultValue)***<br/>
gets a configuration value. If the value doesn't exist, it returns the default value.<br/>
***configPath*** - the path of the configuration file<br/>
***jsonPath*** - the path to the value inside of the configuration file<br/>
***defaultValue*** - the default value to return, if the actual value doesn't exist<br/>
<br/>
-***set(configPath, jsonPath, value)***<br/>
sets a configuration value.<br/>
***configPath*** - the path of the configuration file<br/>
***jsonPath*** - the path to the value inside of the configuration file<br/>
***value*** - the value to set<br/>
<br/>
-***delete(configPath, jsonPath)***<br/>
deletes a configuration value.<br/>
***configPath*** - the path of the configuration file<br/>
***jsonPath*** - the path to the value inside of the configuration file<br/>
<br/>
-***merge(configPath, jsonPath, value)***<br/>
merges a value into an existing configuration.<br/>
***configPath*** - the path of the configuration file<br/>
***jsonPath*** - the path to the value inside of the configuration file<br/>
***value*** - the value to merge<br/>
<br/>
-***forEach(configPath, jsonPath, callbask)***<br/>
goes through all values and calls a callback with the value, key and the json path of the current iteration. If value is an array or object, it calls the callback on each member, else it calls the callback on the actual value<br/>
***configPath*** - the path of the configuration file<br/>
***jsonPath*** - the path to the value inside of the configuration file<br/>
***callback*** - the callback with the arguments value, key, jsonPath.<br/>
<br/>
-***append(configPath, jsonPath, value)***<br/>
appends a value to a configuration array<br/>
***configPath*** - the path of the configuration file<br/>
***jsonPath*** - the path to the value inside of the configuration file<br/>
***value*** - the value to append<br/>
<br/>
-***push(configPath, jsonPath, value)***<br/>
prepends a value to a configuration array<br/>
***configPath*** - the path of the configuration file<br/>
***jsonPath*** - the path to the value inside of the configuration file<br/>
***value*** - the value to prepend<br/>
<br/>
-***shift(configPath, jsonPath)***<br/>
removes the first value of a configuration array and returns it<br/>
***configPath*** - the path of the configuration file<br/>
***jsonPath*** - the path to the value inside of the configuration file<br/>
<br/>
-***pop(configPath, jsonPath)***<br/>
removes the last value of a configuration array and returns it<br/>
***configPath*** - the path of the configuration file<br/>
***jsonPath*** - the path to the value inside of the configuration file<br/>
<br/>
-***clear(configPath, jsonPath)***<br/>
empties a configuration array<br/>
***configPath*** - the path of the configuration file<br/>
***jsonPath*** - the path to the value inside of the configuration file<br/>
<br/>
-***packageJson(configPath, defaultValue)***<br/>
an attempt to read the package.json file. The module searches for the file in the root directory<br/>
***jsonPath*** - the configuration path to the value inside the package.json<br/>
***defaultValue*** - the default value to return if the configuration wasn't found<br/>
<br/>
##Licence
blacktea.configManager is released under the [MIT License](http://www.opensource.org/licenses/MIT).