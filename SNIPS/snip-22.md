---
snip: 22
title: Modular Dapps
author: Xiang (@wenzhenxiang)
status: Draft
type: Standards Track
created: 2023-11-24
---

## Simple Summary
该SNRC是模块化的Dapp系统,该系统没有大小限制,这里Dapp是代码逻辑是单独，独立declare的，Dapp之间可共享存储变量。



## Abstract


## Motivation

1. 提供单一地址实现无限Dapp的可能
2. 避免合约代码大小的限制
3. 提供Dapp存储数据共享，逻辑也可以重复使用，提供更强的组合性
4. 提供添加/替换/删除Dapp功能
5. 该系统可支持不升级
6. Dapp可重复使用
7. 可以直接支持部分现在已部署的dapp

存储脑图





## Specification



## Implementation

默认支持接口注册(外部判断，还需判断是否支持对应dapp)

批量添加/删除OwnerDapp功能
添加，需要判断dapp是否注册；
删除，需要判断是否已添加
添加所有dapp功能;

检查方面功能
读取OwnerDapp状态，{返回有可能为已添加，未存在，或者已删除}
是否添加所有；
读取所有Dapp;(// 现在痛点是Cairo没有查看合约所有dapp的数组功能，读取dapp功能前提需要dapp支持165)


操作功能
写OwnerDapp功能;
读OwnerDapp功能；


安全考虑
dapp 不能使用构造函数，采用init形式
需要注意共用存储，也可能带来存储冲突的问题
每次添加或删除一个或多个dapp时，添加所有dapp时也是，合约都需发出一个事件。所有源代码都可以验证。
这使得人员和软件能够监控合同的变更。如果添加了任何不良的dapp，那么它是可以被看到的，而且可添加的dapp是通过验证后的。




## History

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
