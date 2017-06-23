# wechaty-scrum-poker

这个脚本通过微信来实现Scrum计划会上开发者打牌来确定一个user story的工作量的功能，参会的开发只要给指定微信号发送数字，就能自动计算好工作量。

本脚本使用Wechaty作为微信机器人框架： :octocat: <https://github.com/chatie/wechaty>

## 安装
进入wechaty-scrum-poker目录
```shell
$ npm install chromedriver --chromedriver_cdnurl=https://npm.taobao.org/mirrors/chromedriver
$ npm --registry https://registry.npm.taobao.org install
```

## 运行
```shell
$ node poker.js
```

scrum master扫描二维码登录，开发同事发消息给scrum master的微信来交互。
* 用户指令
	* in：参加打牌
	* out：不参加了
	* 数字：出牌，多次输入覆盖前次
* 管理员指令
	* admin：指定管理员
	* s/stat：查看当前状态
	* f/flush：将当前未出牌同事踢掉，同时进行结算
	* r/reset：重置当前出牌数据
