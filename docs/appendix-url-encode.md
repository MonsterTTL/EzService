# 附录：URL Encode 详解

> 本附录解释 URL Encode 的原理、使用场景以及与后端开发的关联。

---

## 1. 什么是 URL Encode

**URL Encode**（也称为百分号编码，Percent Encoding）是一种将特殊字符转换为可在 URL 中安全传输的格式的编码方式。

### 为什么需要 URL Encode

URL 只能包含特定的 ASCII 字符集。以下字符在 URL 中具有特殊含义或不被允许：

| 问题 | 例子 | 说明 |
|------|------|------|
| 保留字符 | `?`, `&`, `=`, `/` | 用于 URL 结构（查询参数分隔符等） |
| 不安全字符 | 空格、中文、`#` | 可能在传输中被错误解释 |
| 非 ASCII 字符 | `你好`, `café` | URL 标准只支持 ASCII |

如果不编码直接发送：
```
错误例子：https://api.example.com/search?q=hello world
                                          ↑ 空格是非法的！
```

编码后：
```
正确格式：https://api.example.com/search?q=hello%20world
                                              ↑ %20 代表空格
```

---

## 2. 编码规则详解

### 基本规则

1. **保留字符**：原样保留
   - 字母 `A-Z`, `a-z`
   - 数字 `0-9`
   - 特殊符号 `-`, `_`, `.`, `~`

2. **需要编码的字符**：转换为 `%` + 两位十六进制

   ```
   空格 → %20
   !    → %21
   #    → %23
   &    → %26
   =    → %3D
   中   → %E4%B8%AD   (UTF-8 三字节)
   ```

3. **编码算法**：
   - 英文字符 → 查看 ASCII 码 → 转为十六进制
   - 中文字符 → 转为 UTF-8 字节 → 每个字节转为 %XX

### 编码示例

```javascript
// JavaScript 中的 URL Encode
encodeURIComponent("hello world");     // "hello%20world"
encodeURIComponent("你好");            // "%E4%BD%A0%E5%A5%BD"
encodeURIComponent("a=b&c=d");         // "a%3Db%26c%3Dd"
```

**"你好" 的编码过程**：
```
你 → UTF-8 字节: E4 BD A0 → %E4%BD%A0
好 → UTF-8 字节: E5 A5 BD → %E5%A5%BD
```

---

## 3. encodeURI vs encodeURIComponent

JavaScript 提供了两个编码函数，区别很重要：

| 函数 | 编码范围 | 保留不编码 | 使用场景 |
|------|----------|-----------|----------|
| `encodeURI` | 完整 URL | `; , / ? : @ & = + $ #` | 编码整个 URL |
| `encodeURIComponent` | 查询参数值 | 几乎全都编码（除了 `- _ . ~`） | 编码参数值 |

### 对比示例

```javascript
const url = "https://api.example.com/search?q=hello world";

// ❌ 错误：encodeURI 不适合编码参数值
encodeURIComponent("hello world");  // "hello%20world" ✓

// ❌ 错误：用 encodeURIComponent 编码完整 URL
encodeURIComponent(url);  // 会把 : // 也编码了！

// ✓ 正确用法
const baseUrl = "https://api.example.com/search";
const query = encodeURIComponent("hello world");
const fullUrl = `${baseUrl}?q=${query}`;
// 结果: https://api.example.com/search?q=hello%20world
```

---

## 4. 后端开发中的 URL Encode

### 4.1 接收前端参数

当前端发送请求时，浏览器会自动对 URL 中的参数进行编码：

```javascript
// 前端代码
fetch('/api/search?q=' + encodeURIComponent('手机 苹果'))
// 实际发送: /api/search?q=%E6%89%8B%E6%9C%BA%20%E8%8B%B9%E6%9E%9C
```

后端 Express 会自动解码：

```typescript
app.get('/api/search', (req, res) => {
  const query = req.query.q;  // 自动解码为 "手机 苹果"
  console.log(query);
});
```

### 4.2 后端返回带参数的 URL

当后端需要构造 URL 给前端时（如跳转链接、图片 URL），需要正确编码：

```typescript
// 生成带搜索关键词的 URL
function generateSearchUrl(keyword: string): string {
  const encoded = encodeURIComponent(keyword);
  return `https://shop.example.com/search?q=${encoded}`;
}

generateSearchUrl("iPhone 16 Pro");
// 结果: https://shop.example.com/search?q=iPhone%2016%20Pro
```

### 4.3 处理文件路径/文件名

文件下载时，文件名经常需要编码：

```typescript
// 下载接口，处理中文文件名
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;  // 已自动解码

  // 设置下载文件名（需要编码）
  const encodedFilename = encodeURIComponent(filename);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);

  // ... 发送文件
});
```

---

## 5. 常见错误与注意事项

### 错误 1：重复编码

```javascript
// ❌ 错误
const q = encodeURIComponent("hello world");
const url = '/search?q=' + encodeURIComponent(q);
// 结果: q=hello%2520world  (空格变成了 %2520，% 被二次编码)

// ✓ 正确：只编码一次
const url = '/search?q=' + encodeURIComponent("hello world");
```

### 错误 2：解码失败

```typescript
// 如果前端传了未编码的特殊字符，后端解析可能出错
try {
  const data = JSON.parse(decodeURIComponent(req.query.data));
} catch (e) {
  // 处理解码错误或 JSON 解析错误
  res.status(400).json({ error: 'Invalid data format' });
}
```

### 错误 3：+ 号和空格

```
application/x-www-form-urlencoded 格式中：
+ 号代表空格
%20 也代表空格

有时会出现混淆，需要注意
```

---

## 6. 与 Android/iOS 开发的关联

作为移动端开发者，你在日常工作中经常接触 URL Encode：

| 场景 | Android | iOS |
|------|---------|-----|
| 构造 URL | `Uri.encodeQueryValue()` | `addingPercentEncoding(withAllowedCharacters:)` |
| 网络请求 | Retrofit/OkHttp 自动处理 | URLSession/Alamofire 自动处理 |
| 分享链接 | 需要手动编码参数 | 需要手动编码参数 |

### Android 示例

```kotlin
// Kotlin 中编码 URL 参数
val query = Uri.encode("hello world")  // "hello%20world"

// 或者用 OkHttp 的 HttpUrl
val url = HttpUrl.Builder()
    .scheme("https")
    .host("api.example.com")
    .addPathSegment("search")
    .addQueryParameter("q", "hello world")  // 自动编码
    .build()
```

### iOS 示例

```swift
// Swift 中编码
let query = "hello world".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)
// "hello%20world"
```

---

## 7. 总结

| 要点 | 说明 |
|------|------|
| 为什么编码 | URL 只支持特定字符，特殊字符需转义 |
| 编码结果 | `%` + 两位十六进制表示 |
| JS 函数选择 | 参数值用 `encodeURIComponent`，完整 URL 用 `encodeURI` |
| 后端处理 | Express 自动解码参数，构造 URL 时需手动编码 |
| 移动端 | 网络库通常自动处理，但手动构造 URL 时要注意编码 |

---

*本附录补充了 HTTP 协议和 Web 开发中的 URL Encode 知识。*
