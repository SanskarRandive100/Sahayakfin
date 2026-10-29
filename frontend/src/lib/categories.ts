import {
  Banknote, Receipt, Fuel, UtensilsCrossed, Home, Zap, Smartphone, Bus, Users,
  Stethoscope, GraduationCap, ShoppingBag, Banknote as Cash, CreditCard, PiggyBank,
  Scale, ArrowLeftRight, HelpCircle, Package, Coins,
} from 'lucide-react'
import type { Category } from '../api/types'

export interface CategoryStyle {
  key: string
  icon: typeof Banknote
  color: string
  bg: string
}

export const categoryStyle: Record<Category, CategoryStyle> = {
  PLATFORM_PAYOUT:  { key: 'category.PLATFORM_PAYOUT',  icon: Package,          color: '#1a7f37', bg: '#e6f4ea' },
  CUSTOMER_RECEIPT: { key: 'category.CUSTOMER_RECEIPT', icon: Coins,            color: '#1a7f37', bg: '#e6f4ea' },
  CASH_DEPOSIT:     { key: 'category.CASH_DEPOSIT',     icon: Banknote,         color: '#1a7f37', bg: '#e6f4ea' },
  OTHER_INCOME:     { key: 'category.OTHER_INCOME',     icon: Banknote,         color: '#1a7f37', bg: '#e6f4ea' },
  FUEL:             { key: 'category.FUEL',             icon: Fuel,             color: '#9a3412', bg: '#fff7ed' },
  FOOD:             { key: 'category.FOOD',             icon: UtensilsCrossed,  color: '#b45309', bg: '#fef3c7' },
  RENT:             { key: 'category.RENT',             icon: Home,             color: '#7c3aed', bg: '#f5f3ff' },
  BILLS:            { key: 'category.BILLS',            icon: Zap,              color: '#0369a1', bg: '#e0f2fe' },
  PHONE:            { key: 'category.PHONE',            icon: Smartphone,       color: '#0891b2', bg: '#ecfeff' },
  TRANSPORT:        { key: 'category.TRANSPORT',        icon: Bus,              color: '#0e7490', bg: '#ecfeff' },
  FAMILY:           { key: 'category.FAMILY',           icon: Users,            color: '#be185d', bg: '#fdf2f8' },
  HEALTH:           { key: 'category.HEALTH',           icon: Stethoscope,      color: '#be123c', bg: '#ffe4e6' },
  EDUCATION:        { key: 'category.EDUCATION',        icon: GraduationCap,    color: '#1d4ed8', bg: '#eff6ff' },
  SHOPPING:         { key: 'category.SHOPPING',         icon: ShoppingBag,      color: '#a21caf', bg: '#faf5ff' },
  CASH_WITHDRAWAL:  { key: 'category.CASH_WITHDRAWAL',  icon: Cash,             color: '#4b5563', bg: '#f3f4f6' },
  EMI:              { key: 'category.EMI',              icon: CreditCard,       color: '#7c2d12', bg: '#fef3c7' },
  SAVINGS:          { key: 'category.SAVINGS',          icon: PiggyBank,        color: '#047857', bg: '#d1fae5' },
  FEES_CHARGES:     { key: 'category.FEES_CHARGES',     icon: Scale,            color: '#6b7280', bg: '#f3f4f6' },
  SELF_TRANSFER:    { key: 'category.SELF_TRANSFER',    icon: ArrowLeftRight,   color: '#6b7280', bg: '#f3f4f6' },
  OTHER:            { key: 'category.OTHER',            icon: HelpCircle,       color: '#6b7280', bg: '#f3f4f6' },
}

export function iconFor(cat: Category) { return categoryStyle[cat] ?? categoryStyle.OTHER }

// used by Receipt import to avoid unused warning (if any)
export const _receipt = Receipt
