import { IComponent, IElement, IVirtualNode } from 'libs/Cheburact/types';
import { getTreeBuilder, IRootContext } from '../utils';
import { FiberTypes, IFiberNode, UpdateQueueItem } from '../types';

import eraseEqualFiberCollectionItem from './eraseEqualFiberCollectionItem';
import getFlatArrayFromCollection from './getFlatArrayFromCollection';
import findItemInUpdateQueue from './findItemInUpdateQueue';
import spreadFibersByType from './spreadFibersByType';
import { FiberCollectionItem } from './types';
import unmount from './unmount';


export default function updateTree(
    rootContext: IRootContext,
    updateQueue: Array<UpdateQueueItem>,
): Array<IFiberNode> | null {
  const { referenceFiberRoot, rootHTMLContainer } = rootContext;

  if (referenceFiberRoot === null || rootHTMLContainer === null) {
    // Нечего обновлять
    return null;
  }

  const updateOrCreateFiberWithElement = (
      $target: HTMLElement,
      fiber: IFiberNode | null,
      element: IElement,
  ): IFiberNode | null => {
    if (!rootContext.updater || fiber && !fiber.ref && fiber.type !== FiberTypes.COMPONENT) {
      return null;
    }

    if (!fiber) {
      const builtTree = getTreeBuilder(rootContext)($target, element);
      if (!builtTree || builtTree.length === 0) {
        return null;
      }
      return builtTree[ 0 ];
    }

    if (fiber.type === FiberTypes.STRING) {
      return rootContext.updateTextFiber(fiber, element as string);
    }

    if (fiber.type === FiberTypes.VIRTUAL_NODE) {
      const nextFiber = rootContext.updateVNodeFiber(fiber, element as IVirtualNode);
      if (!nextFiber) {
        return null;
      }
      nextFiber.children = reconcileTrees(
          (nextFiber.ref as HTMLElement),
          nextFiber.children,
          (element as IVirtualNode).children
      );
      return nextFiber;
    }

    if (fiber.type === FiberTypes.COMPONENT) {
      const prevComp = fiber.stateNode as IComponent;
      const nextComp = element as IComponent;

      const { nextState } = findItemInUpdateQueue(prevComp, updateQueue) || {};
      prevComp.writeState({ ...prevComp.getState(), ...(nextState || {}) });
      prevComp['props'] = nextComp.getProps();

      let renderedTree: any = prevComp.render();
      if (!Array.isArray(renderedTree)) {
        renderedTree = [renderedTree];
      }

      fiber.children = reconcileTrees($target, fiber.children, renderedTree);
      fiber.stateNode = prevComp;
      return fiber;
    }
    return null;
  };

  const reconcileTrees = (
      $target: HTMLElement,
      fibers: Array<IFiberNode>,
      elements: Array<IElement>,
  ): Array<IFiberNode> => {
    const collection = spreadFibersByType(fibers);
    const itemsToUpdate: Array<[FiberCollectionItem | null, IElement]>
        = elements.map((el: IElement) => ([
      eraseEqualFiberCollectionItem(collection, el),
      el,
    ]));

    // Удаляем оставшиеся элементы
    const itemsToDelete = getFlatArrayFromCollection(collection);
    itemsToDelete.forEach((item) => item && unmount(item.fiber));

    // Обновляем и вставляем в target с текущего индекса
    const nextChildren: Array<IFiberNode> = [];
    itemsToUpdate.forEach(([item, el]) => {
      const { fiber } = (item || { fiber: null });
      const nextFiber = updateOrCreateFiberWithElement($target, fiber, el);
      if (nextFiber) {
        nextChildren.push(nextFiber);
        if (nextFiber.type !== FiberTypes.COMPONENT && nextFiber.ref) {
          $target.appendChild(nextFiber.ref);
        }
      }
    });

    return nextChildren;
  };

  const bypassFiber = (fiberNodes: Array<IFiberNode>, $target: HTMLElement): Array<IFiberNode> => {
    return fiberNodes.map((node: IFiberNode) => {
      const $nextTarget = node.ref instanceof HTMLElement ? node.ref : $target;

      if (node.type === FiberTypes.COMPONENT) {
        const qItem = findItemInUpdateQueue(node.stateNode as any, updateQueue);
        if (qItem) {
          const element = qItem.fiberNode.stateNode as IComponent;
          element.writeState(qItem.nextState);
          let renderedTree: any = element.render();
          if (!Array.isArray(renderedTree)) {
            renderedTree = [renderedTree];
          }

          node.children = reconcileTrees($target, node.children, renderedTree);
          return node;
        }
      }

      node.children = bypassFiber(node.children, $nextTarget);
      return node;
    });
  };

  return bypassFiber(rootContext.referenceFiberRoot || [], rootHTMLContainer);
}
