/**
 *Poker planning for scrum using wechat bot
 */

const {
    config,
    Wechaty,
    log,
    Message,
} = require('wechaty')
const bot = Wechaty.instance({ profile: config.DEFAULT_PROFILE })

//每人出牌分数
var votes = {};
//开发者列表
var devs = {};
//房管
var roomAdmin;
//最后一个投票的人名
var lastName;

const welcomeForUser = `
贴士:输入数字,成功返回进度,重新输入数字修改
'out' > 不玩啦
'0' > 刚输入的数字不算`;
const welcomeForRoomAdmin = `
房管贴士:除用户命令外还支持以下
's/stat' > 查看当前统计
'f/flush' > 当前没投票的同事都踢掉
‘r/reset’ > 重置当前轮投票`;
//最后几票提醒
const voteLastWarningCount = 2;

bot
.on('login' , user => {
    log.info('admin', `superadmin ${user.name()} logined`);
    loadUsers();
})
.on('logout', user => log.info('admin', `superadmin ${user.name()} logouted`))
.on('error' , e => log.info('bot', 'error: %s', e))
.on('scan'  , ({url, code}) => {
    log.info('bot', `Scan QR Code to login wechat`);
})
.on('message', m => {
    //忽略所有群消息
    if(m.room()){
        return;
    }

    //log.info('dev', '[%@] send: %s',from, m.content());
    //是否是管理员
    if (isAdmin(m)) {
        //先解析管理员命令
        if (parseAdminMessage(m)) return;
        if(!isSuperAdmin(m)){//如果不是超级管理员，房管也可能是普通投票
            if (!parseMessage(m)) {
                //提示一下管理员命令
                m.say('[疑问]' + welcomeForRoomAdmin);
            }
        }
    }else{
        //普通用户
        if (!parseMessage(m)) {
            m.say('[疑问]' + welcomeForUser);
        }
    }
})

bot.init()
.catch(e => {
  log.error('bot', 'init() fail: %s', e)
  bot.quit()
  process.exit(-1)
})

function saveUsers(){
    //todo
}

function loadUsers(){
    //todo
}

function isAdmin(m){
  //超级管理员 or 房间管理员
  return isSuperAdmin(m) || (roomAdmin && roomAdmin.id == m.from().id);
}
function isSuperAdmin(m){
    return m.self();
}

function parseAdminMessage(m){
    const content = m.content().toLowerCase();
    //能否解析要返回
    var understand = false;
    switch (content) {
    case "f":
    case "flush":
        log.info('admin', `flush`);
        understand = true;
        var before = userCount();
        flush();
        var after = userCount();
        sendMessage(roomAdmin?roomAdmin:m.to(),"[胜利]("+before+")->("+after+")");
        break;
    case "r":
    case "reset":
        log.info('admin', `reset`);
        understand = true;
        votes = {};
        sendMessage(roomAdmin?roomAdmin:m.to(),"[胜利]("+userCount()+")");
        break;
    case "admin":
        //only superadmin can do it now
        if (isSuperAdmin(m)) {
            log.info('admin','assign %s to admin',m.to().name())
            roomAdmin = m.to();
            understand = true;
            sendMessage(roomAdmin,'[微笑]' + welcomeForRoomAdmin);
        }
        break;
    case "s":
    case "stat":
        log.info('admin', `stat`);
        checkStat(m);
        understand = true;
        break;
    }
    return understand;
}

function parseMessage(m){
    const content = m.content().toLowerCase();
    const from = m.from().name();
    if (content == 'in') {
        //dev加入
        votes[from]=0;
        devs[from]=m.from();
        log.info('dev', `${from} in`);
        m.say('[微笑]('+ userCount() + ')' + welcomeForUser);
        return true;
    }else if (content == 'out'){
        //dev退出
        delete votes[from];
        delete devs[from];
        log.info('dev', `${from} out`);
        m.say('[再见]');
        return true;
    }else if (votes[from] !== undefined){
        //期待输入的数字，输入0表示清掉上一次
        if (!isNaN(content)) {
            votes[from] = parseFloat(content)
            lastName = from;
            console.log(votes);
            //check done
            checkDone(m);
            return true;
        }else{
            return false;
        }
    }

    //这种就是正常的微信消息了
    return true;
}

function checkDone(m){
    var i=0;var j=0;
    for (var name in votes) {
        j++;
        var e = votes[name];
        if (e>0) {
            i++;
        }
    }
    if (i<j || i<3) {
        //wait
        m.say('[OK]('+i+'/'+j+')');
        //提示房管最后的未投票
        if (roomAdmin && j-i==voteLastWarningCount) {
            checkUnvoted(i);
        }
    }else{
        //done
        m.say('[OK]('+i+'/'+j+')');
        flush();
    }
}

function checkUnvoted(i){
    var result = '[机智]拖后腿的('+i+'/'+(i+voteLastWarningCount)+')';
    for (var name in votes) {
        var e = votes[name];
        if (e<=0) {
            result = result + '\n' + name;
        }
    }
    if (roomAdmin) {
        sendMessage(roomAdmin,result);
    }
}

function checkStat(m){
    var i=0;var j=0;
    var stat='';
    for (var name in votes) {
        j++;
        var e = votes[name];
        if (e>0) {
            i++;
        }
        stat = stat + '\n' + name +" : " + e;
    }
    sendMessage(roomAdmin?roomAdmin:m.to(),"[嘿哈]("+ i +"/" + j + ")" + stat);
}

function sendMessage(to,content){
    var mm = new Message();
    mm.to(to);
    mm.content(content);
    return config.puppetInstance()
              .send(mm);
}

function userCount(){
    return Object.keys(devs).length;
}

function flush(){
  //先找到最大最小值
    var maxName,minName;
    var maxE = 0;var minE = Number.MAX_SAFE_INTEGER;
    for (var name in votes) {
        var e = votes[name];
        if (e<=0) continue;
        if (e>maxE) {
            maxE = e;
            maxName = name;
        }
        if (e<minE) {
            minE = e;
            minName = name;
        }
    }

    var result = '';
    var total = 0;var count = 0;
    for (var name in votes) {
        var e = votes[name];
        if (e<=0) {
            //flush时有没写的，说明应该是admin flush的，这个时候去掉这个没完成的人
            delete votes[name];
            delete devs[name];
            //这里先不通知被踢掉的人了，容易被微信屏蔽
        }else{
            result = result + '\n' + name +" : " + e;
            if (name === maxName || name === minName) {
                result +=' [敲打]';
            }else{
                total+=e;
                count ++;
            }

            votes[name]=0;//clear for next round
        }
    }
    result = '[得意] ' + Math.round(total*2/count)/2 + ' ' + result;
    //如果有房管发给房管,没有房管发给最后投票的,还找不到随机发
    if (roomAdmin) {
        sendMessage(roomAdmin,result);
    }else{
        var lastOne = devs[lastName];
        if (lastOne) {
            sendMessage(lastOne,result);
        }else{
            sendMessage(devs[Object.keys(devs)[0]],result);
        }
    }

    saveUsers();
}
