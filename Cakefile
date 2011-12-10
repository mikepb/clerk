#
#   Copyright 2011 Michael Phan-Ba
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.
#

child_process = require 'child_process'

exec = (command) ->
  child_process.exec command, (err, stdout, stderr) ->
    throw err or stderr if err or stderr
    console.log stdout

task 'test', 'run tests', ->
  exec 'rm -r test && mkdir test && coffee -c -o test spec && mocha'
  exec "find test-vows -name '*-test.js' -print0 | xargs -0 vows -i"
