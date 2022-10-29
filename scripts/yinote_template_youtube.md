---
created: {{createdAt_date}}
type: "yinote"
yinote_id: "{{id}}"
{{#meta}}provider: "{{provider}}"{{/meta}}
{{#meta}}title: "{{title}}"{{/meta}}
{{#meta}}url: "{{url}}"{{/meta}}
{{#oembed}}author_name: "youtube:{{author_name}}"{{/oembed}}
---
YOUTUBE TEMPLATE
{{#meta}}
# {{title}}

Video: [{{title}}]({{url}}){{/meta}}
{{#oembed}}Channel: [{{author_name}}]({{author_url}}){{/oembed}}
{{#meta}}
> {{description}}

![{{title}}]({{image_local}})
{{/meta}}

## My Notes
{{#notes}}
### [{{time}}]({{timestampurl}})
{{#conditional_image}}![img]({{image_local}}){{/conditional_image}}
{{content}}

---
{{/notes}}
