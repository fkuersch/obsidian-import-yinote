---
created: {{createdAt_date}}
type: "yinote"
yinote_id: "{{id}}"
{{#meta}}provider: "{{provider}}"{{/meta}}
{{#oembed}}author: "@ytch:{{author_name}}"{{/oembed}}
{{#meta}}title: "{{title}}"{{/meta}}
{{#meta}}url: "{{url}}"{{/meta}}
---
Status: #📥 
Tags: 
Links: 
___
YOUTUBE TEMPLATE
{{#meta}}# {{title}}

Video Link: [{{title}}]({{url}}){{/meta}}
{{#oembed}}Channel Link: [{{author_name}}]({{author_url}})
Author: [[@ytch:{{author_name}}]]{{/oembed}}
{{#meta}}
> [!abstract]+ Video Description
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
