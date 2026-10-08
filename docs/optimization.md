# Optimization Algorithms & Mathematics

## Mathematical Model

### Distance Matrix
Pairwise road distance:
$$d_{\text{road}}(i, j) = 1.3 \times d_{\text{Haversine}}(i, j)$$
Where $d_{\text{Haversine}}$ uses Earth radius $R = 6371.0 \text{ km}$.

### Travel Time
$$t_{\text{travel}}(i, j) = \frac{d_{\text{road}}(i, j)}{25 \text{ km/h}} \times 60 \text{ minutes}$$

### Objective Function
$$\text{Maximize } \text{Score} = \sum_{c \in \text{Scheduled}} \text{priority\_score}(c) - \left(\lambda \times \sum_{e \in \text{Exec}} \text{total\_route\_km}(e)\right)$$
Default $\lambda = 2.0$.

## Solvers

### 1. Baseline Sequential Optimizer
Sorts customers by customer ID ascending. Greedily inserts each candidate stop into the nearest feasible executive roster. Guarantees 0 violations while serving as an honest benchmark.

### 2. Smart Greedy Optimizer
- **Phase 1: PTP Priority Guarantee**: Promise-to-pay accounts are scheduled first across all executives, selecting insertion positions that minimize incremental detour.
- **Phase 2: Marginal Business Value**: Remaining optional visits evaluated by:
$$\Delta\text{Score} = \text{priority\_score} - (\lambda \times \Delta\text{km})$$
- Only insertions strictly maintaining all 13 hard constraints are admitted.

### 3. 2-Opt Local Search
Iterates through all pairs of non-adjacent edges within each executive route. Reverses the tour segment if:
1. The perturbed tour remains strictly feasible under time windows and shift limits.
2. Total distance strictly decreases.
