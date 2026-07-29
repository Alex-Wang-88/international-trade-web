# Permission matrix

| Capability | Anonymous | Editor | Owner |
| --- | ---: | ---: | ---: |
| Read published products and posts | Yes | Yes | Yes |
| Read drafts and unlisted content | No | Yes | Yes |
| Create/edit products, posts, media and company details | No | Yes | Yes |
| Save drafts, publish and unlist | No | Yes | Yes |
| Order up to eight homepage products | No | Yes | Yes |
| Retry failed translations | No | Yes | Yes |
| Permanently delete products/posts | No | No | Yes, exact-name confirmation |
| Manage accounts and roles | No | No | Yes |
| Read audit events and failed job details | No | No | Yes |
| Change system configuration | No | No | Yes |

The application prevents deleting oneself and prevents demoting or deleting the
last owner. Admin navigation hides owner-only collections for editors; API access
rules remain the source of truth.
