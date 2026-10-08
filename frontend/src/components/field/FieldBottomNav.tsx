import React from 'react';
import { 
  Home, Compass, Users, CheckCircle2, User 
} from 'lucide-react';

export type FieldTabType = 'home' | 'route' | 'customers' | 'activity' | 'profile';

interface FieldBottomNavProps {
  activeTab: FieldTabType;
  onSelectTab: (tab: FieldTabType) => void;
  completedStopsCount?: number;
}

export const FieldBottomNav: React.FC<FieldBottomNavProps> = ({
  activeTab,
  onSelectTab,
  completedStopsCount = 0
}) => {
  const tabs = [
    { id: 'home' as FieldTabType, label: 'Home', icon: Home },
    { id: 'route' as FieldTabType, label: 'My Route', icon: Compass },
    { id: 'customers' as FieldTabType, label: 'Customers', icon: Users },
    { id: 'activity' as FieldTabType, label: 'Activity', icon: CheckCircle2, badge: completedStopsCount > 0 },
    { id: 'profile' as FieldTabType, label: 'Profile', icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#DDE7ED] shadow-xl pb-safe">
      <div className="max-w-lg mx-auto px-2 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={
                "flex-1 min-h-[52px] py-1 px-1 flex flex-col items-center justify-center gap-1 rounded-xl transition cursor-pointer select-none active:scale-95 relative " +
                (isActive
                  ? "text-[#FF7A18] font-black"
                  : "text-[#71869A] hover:text-[#123A55] font-semibold")
              }
            >
              <div className="relative">
                <Icon className={"w-5 h-5 " + (isActive ? "stroke-[2.5]" : "stroke-[1.75]")} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#10A88A] ring-2 ring-white" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="w-5 h-0.5 rounded-full bg-[#FF7A18] absolute bottom-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
