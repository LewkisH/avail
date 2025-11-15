import json
from datetime import datetime, timedelta

# --- Helpers ---

def parse_dt(s):
    return datetime.fromisoformat(s)


def intervals_overlap(s1, e1, s2, e2):
    return s1 < e2 and s2 < e1


def user_is_free_for_slot(user, slot_start, slot_end):
    for b in user.get('calendar_busy', []) or []:
        bstart = parse_dt(b['start'])
        bend = parse_dt(b['end'])
        if intervals_overlap(slot_start, slot_end, bstart, bend):
            return False
    return True


def weekday_mon0(d):
    wd = d.weekday()  # Monday=0
    return wd


def get_day_score(dt):
    wd = weekday_mon0(dt)
    if wd in (0,1,2):
        return 1
    if wd == 3:
        return 5
    if wd == 6:
        return 8
    return 10


def get_sday_factor(dt):
    wd = weekday_mon0(dt)
    if wd in (0,1,2):
        return 0.2
    if wd == 3:
        return 0.4
    if wd in (4,5):
        return 1.0
    return 0.8


def get_time_window_score(dt):
    hour = dt.hour
    wd = weekday_mon0(dt)

    def choose(table):
        for sh, eh, sc in table:
            if hour >= sh and hour < eh:
                return sc
        return 1

    if wd in (0,1,2):
        table = [(0,8,1),(8,12,2),(12,16,3),(16,18,4),(18,20,8),(20,22,5),(22,24,2)]
        return choose(table)
    if wd == 3:
        table = [(0,8,1),(8,12,2),(12,16,3),(16,18,5),(18,20,8),(20,22,6),(22,24,4)]
        return choose(table)
    if wd == 4:
        table = [(0,8,1),(8,12,2),(12,16,3),(16,18,5),(18,20,8),(20,22,10),(22,24,8)]
        return choose(table)
    if wd == 5:
        table = [(0,8,1),(8,12,2),(12,16,4),(16,18,6),(18,20,8),(20,22,10),(22,24,8)]
        return choose(table)
    if wd == 6:
        table = [(0,8,1),(8,12,3),(12,16,7),(16,18,8),(18,20,7),(20,22,4),(22,24,1)]
        return choose(table)
    return 1


def get_duration_score(hours):
    if hours < 1:
        return 1
    if hours > 4:
        return 10
    if hours > 3:
        return 8
    if hours > 2:
        return 5
    if hours > 1:
        return 3
    return 1


def compute_slot_score(slot_start, slot_end, group_size, available_size):
    day_score = get_day_score(slot_start)
    z = get_time_window_score(slot_start)
    sday = get_sday_factor(slot_start)

    S1 = day_score * 0.35
    S2 = z * sday * 0.2
    S3 = 0
    if available_size > 0:
        S3 = (group_size / available_size) * 10 * 0.25
    duration_hours = (slot_end - slot_start).total_seconds() / 3600.0
    dscore = get_duration_score(duration_hours)
    S4 = dscore * 0.2
    return S1 + S2 + S3 + S4


def distance_bucket(d):
    if d < 1.5:
        return 10
    if d < 3.5:
        return 8
    if d < 6.0:
        return 6
    if d < 10.0:
        return 3
    return 1


def cost_bucket(p):
    if p >= 50:
        if p > 50:
            return 2
        return 6
    if p >= 25:
        return 8
    if p >= 10:
        return 10
    return 10


def compute_activity_score(act):
    dist = act.get('distance_km', 5.0) or 5.0
    price = act.get('price_eur', 10.0) or 10.0
    prox = distance_bucket(dist)
    cost = cost_bucket(price)
    return prox * 0.6 + cost * 0.4


def compute_group_recommendations(data):
    users_by_id = {u['id']: u for u in data.get('users', [])}
    results = {}
    for g in data.get('groups', []):
        members = [users_by_id[mid] for mid in g.get('members', []) if mid in users_by_id]
        recs = []
        for act in data.get('activities', []):
            astart = parse_dt(act['start'])
            aend = parse_dt(act['end'])
            free = [m for m in members if user_is_free_for_slot(m, astart, aend)]
            if len(free) != len(members):
                continue
            slot_score = compute_slot_score(astart, aend, len(members), len(free))
            activity_score = compute_activity_score(act)
            total = slot_score + activity_score
            recs.append({
                'groupId': g['id'],
                'activityId': act['id'],
                'activityName': act['name'],
                'slotStart': act['start'],
                'slotEnd': act['end'],
                'slotScore': round(slot_score,3),
                'activityScore': round(activity_score,3),
                'totalScore': round(total,3),
                'location': act.get('location'),
                'price_eur': act.get('price_eur'),
                'distance_km': act.get('distance_km')
            })
        recs.sort(key=lambda x: x['totalScore'], reverse=True)
        results[g['id']] = recs
    return results


if __name__ == '__main__':
    with open('test_input_user.json','r',encoding='utf-8') as f:
        data = json.load(f)
    recs = compute_group_recommendations(data)
    for gid, lst in recs.items():
        print('\n=== GROUP', gid, '===')
        for r in lst[:3]:
            print(f"{r['activityId']} | {r['activityName']} | {r['slotStart']}–{r['slotEnd']} | total={r['totalScore']}")
