---
created: {{createdAt_utc_isostring}}
yinote_id: {{id}}
{{#oembed}}author_name: {{author_name}}{{/oembed}}
---
YOUTUBE TEMPLATE
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
{{#conditional_image}}![img]({{image_local}}){{/conditional_image}}
{{content}}

---
{{/notes}}
