This directory contains the config files for generating MapFishAPI api documentation.

To have the apidoc manually generated, follow these steps:
* Install NaturalDocs in /path/to/naturaldocs according to instructions available at http://naturaldocs.org/download.html
* Copy Menu.txt in some tmp dir
  * $ cp /path/to/mfapi/apidoc_config/* /tmp/naturaldocs_workdir/.
* Generate the apidoc
  * $ cd /path/to/naturaldocs
  * $ ./NaturalDocs -i /path/to/mfapi/MapFishApi/js -p /tmp/naturaldocs_workdir -o HTML /path/to/generated/apidoc -r -ro
