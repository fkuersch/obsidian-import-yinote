---
created: {{createdAt_utc_isostring}}
yinote_id: {{id}}
{{#oembed}}author_name: {{author_name}}{{/oembed}}
{{#oembed}}upload_date: {{upload_date}}{{/oembed}}
---
VIMEO TEMPLATE
{{#meta}}
# {{title}}
{{/meta}}
{{#oembed}}![Thumbnail]({{thumbnail_url_with_play_button_local}}){{/oembed}}
{{#meta}}
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
{{#conditional_image}}![frame]({{image_local}}){{/conditional_image}}
{{content}}

---
{{/notes}}
