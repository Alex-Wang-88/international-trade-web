'use client'

import { Banner } from '@payloadcms/ui/elements/Banner'
import { useLocale } from '@payloadcms/ui'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import './index.scss'

type DashboardData = {
  audits?: Array<{ action: string; at: string; id: number; summary: string }>
  quality: { contactMissing: boolean; missingImages: number }
  recent: Array<{ at: string; href: string; title: string; type: string }>
  role?: 'editor' | 'owner'
  stats: {
    draftProducts: number
    failedTranslations: number
    publishedPosts: number
    publishedProducts: number
    unlistedProducts: number
  }
}

const entries = [
  { description: '新增、保存草稿、发布或批量下架商品。', href: '/admin/collections/products', title: '商品管理' },
  { description: '选择最多 8 个已发布商品并拖动排序。', href: '/admin/globals/homepage', title: '首页商品排序' },
  { description: '撰写文章、预览草稿并正式发布。', href: '/admin/collections/posts', title: '博客管理' },
  { description: '统一维护品牌介绍、邮箱、电话和地址。', href: '/admin/globals/company', title: '公司资料与联系方式' },
]

export default function BeforeDashboard() {
  const locale = useLocale()
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/dashboard', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setData)
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  return (
    <div className="before-dashboard">
      <Banner className="before-dashboard__banner" type="success">
        <h4>欢迎回来。保存原文会立即完成，其他语言将在后台继续翻译。</h4>
      </Banner>

      <nav aria-label="后台主要功能" className="before-dashboard__entries">
        {entries.map((entry) => (
          <Link href={entry.href} key={entry.href}>
            <strong>{entry.title}</strong>
            <span>{entry.description}</span>
          </Link>
        ))}
      </nav>

      {data && (
        <>
          <section aria-label="内容状态" className="before-dashboard__stats">
            <div><strong>{data.stats.draftProducts}</strong><span>商品草稿</span></div>
            <div><strong>{data.stats.publishedProducts}</strong><span>已发布商品</span></div>
            <div><strong>{data.stats.unlistedProducts}</strong><span>已下架商品</span></div>
            <div><strong>{data.stats.publishedPosts}</strong><span>已发布文章</span></div>
            <div className={data.stats.failedTranslations ? 'is-warning' : ''}>
              <strong>{data.stats.failedTranslations}</strong><span>翻译失败内容</span>
            </div>
          </section>

          {(data.quality.missingImages > 0 || data.quality.contactMissing) && (
            <Banner type="info">
              内容质量提示：
              {data.quality.missingImages > 0 && ` ${data.quality.missingImages} 个商品缺少图片。`}
              {data.quality.contactMissing && ' 公司业务邮箱尚未填写。'}
            </Banner>
          )}

          <div className="before-dashboard__columns">
            <section>
              <h3>最近发布</h3>
              {data.recent.length ? (
                <ul>{data.recent.map((item) => <li key={`${item.type}-${item.href}`}><Link href={item.href}>{item.type} · {item.title}</Link></li>)}</ul>
              ) : <p>暂无已发布内容。</p>}
            </section>
            {data.role === 'owner' && (
              <section>
                <h3>最近审计记录</h3>
                {data.audits?.length ? (
                  <ul>{data.audits.map((item) => <li key={item.id}>{item.summary}</li>)}</ul>
                ) : <p>暂无审计记录。</p>}
              </section>
            )}
          </div>
        </>
      )}

      <p className="before-dashboard__footer">
        <Link href={`/${locale.code}`} rel="noreferrer" target="_blank">查看当前语言前台</Link>
        {data?.role === 'owner' && <> · <Link href="/admin/collections/users">管理账号</Link> · <Link href="/admin/collections/audit-events">查看全部审计记录</Link></>}
      </p>
    </div>
  )
}
