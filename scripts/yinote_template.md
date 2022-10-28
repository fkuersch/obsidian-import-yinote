---
created: {{createdAt_utc_isostring}}
yinote_id: {{id}}
---
{{#meta}}
# {{title}}
![{{title}}]({{image_local}})

Source: {{provider}} {{url}}
Keywords: {{keywords}}
{{/meta}}

{{#oembed}}
{{author_name}} {{author_url}}

{{html}}
{{/oembed}}

{{#meta}}
## Description
```
{{description}}
```
{{/meta}}

## My Notes
{{#notes}}
### [{{time}}]({{timestampurl}})
![{{time}}]({{image_local}})
{{content}}

---
{{/notes}}
