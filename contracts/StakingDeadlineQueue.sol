// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @dev Packed deadline/ID min-heap. Root operations only; inactive entries are
/// pruned lazily by the staking checkpoint. Packing halves swap storage writes.
library StakingDeadlineQueue {
    struct Queue { uint256[] keys; }
    function length(Queue storage q) internal view returns(uint256) { return q.keys.length; }
    function firstId(Queue storage q) internal view returns(uint256) {
        return q.keys.length > 0 ? uint192(q.keys[0]) : 0;
    }
    function nextTime(Queue storage q) internal view returns(uint256) {
        return q.keys.length > 0 ? q.keys[0] >> 192 : type(uint256).max;
    }
    function first(Queue storage q) internal view returns(uint256 id,uint256 at) {
        if(q.keys.length==0)return(0,type(uint256).max);
        uint256 key=q.keys[0];id=uint192(key);at=key>>192;
    }
    function insert(Queue storage q,uint256 id,uint256 at) internal {
        assert(id!=0 && id<=type(uint192).max && at<=type(uint64).max);
        q.keys.push((at<<192)|id);
        uint256 i=q.keys.length-1;
        while(i>0){uint256 parent=(i-1)/2;if(q.keys[parent]<=q.keys[i])break;_swap(q,i,parent);i=parent;}
    }
    function updateFirst(Queue storage q,uint256 at) internal {
        uint256 key=q.keys[0];assert(at>=(key>>192) && at<=type(uint64).max);
        q.keys[0]=(at<<192)|uint192(key);_down(q);
    }
    function removeFirst(Queue storage q) internal {
        uint256 last=q.keys.length-1;
        if(last>0)q.keys[0]=q.keys[last];
        q.keys.pop();if(last>0)_down(q);
    }
    function _swap(Queue storage q,uint256 a,uint256 b) private {
        uint256 key=q.keys[a];q.keys[a]=q.keys[b];q.keys[b]=key;
    }
    function _down(Queue storage q) private {
        uint256 n=q.keys.length;uint256 i=0;
        while(i<n/2){uint256 child=i*2+1;
            if(child+1<n && q.keys[child+1]<q.keys[child])++child;
            if(q.keys[i]<=q.keys[child])break;_swap(q,i,child);i=child;
        }
    }
}
