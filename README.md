<br>
<br>

<img src="./inde.png">

<br>
<br>

# Inde-ts-models-generator



Single-command script to generate angular-style classes (*.model.ts) starting from Instant developer api $metadata descriptor

<br>
<br>

## Installation
<hr>

If you want to use function directly in your code, you can install the package locally

```bash
    npm i --save inde-ts-models-generator 
```

If you want to use it direcly from terminal, install it globally istead

```bash
    npm i -g inde-ts-models-generator
```


<br>
<br>



## Usage
<hr>
<br>

### Single command usage
to generate files, simply run 
```bash
    inde-ts-models generate -u https://my-application.aspx/$metadata
```
where "-u" option is the url of your Instant Developer application where $metadata informations are exposed.

<br>

Alternatively, you can provide a filesystem path of a xml file containing the $metadata infos

```bash
    inde-ts-models generate -f ./my-metadata-file.xml
```


Optionally, you can provide a configuration file path, where you can specify more config options (see "Configuration" section below for more infos)

```bash
    inde-ts-models generate -u {{METADATA URL}} -c ./configuration.json
```







<br>


### Code usage



<br>


### Configuration

Optionally, with "-c" option, you can provide a configuration file in json format, which allow you to customize the script behavior. 

##### In any case, remember that the options provided via command line will take precedence over those in the configuration file


Here you can see the expected config file structure, and also the default values:

```json
{

}
```



