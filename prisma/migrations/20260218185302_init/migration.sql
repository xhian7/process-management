-- CreateEnum
CREATE TYPE "PhaseMaterialType" AS ENUM ('INPUT', 'OUTPUT');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('RECIPE', 'PROCEDURE', 'UNIT_PROCEDURE', 'OPERATION');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'FAILED');

-- CreateTable
CREATE TABLE "Material" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "uom" VARCHAR(20) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "targetExecutionTime" BIGINT NOT NULL,
    "instructions" TEXT,
    "isBuildingBlock" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseMaterial" (
    "id" SERIAL NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "materialId" VARCHAR(50) NOT NULL,
    "quantityRelation" DECIMAL(10,2) NOT NULL,
    "uom" VARCHAR(20) NOT NULL,
    "type" "PhaseMaterialType" NOT NULL,

    CONSTRAINT "PhaseMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "class" VARCHAR(50),
    "isClass" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentParameter" (
    "id" SERIAL NOT NULL,
    "equipmentId" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "valueDefinition" JSON,
    "uom" VARCHAR(20) NOT NULL,

    CONSTRAINT "EquipmentParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseEquipment" (
    "phaseId" INTEGER NOT NULL,
    "equipmentId" VARCHAR(50) NOT NULL,

    CONSTRAINT "PhaseEquipment_pkey" PRIMARY KEY ("phaseId","equipmentId")
);

-- CreateTable
CREATE TABLE "PhaseEquipmentParameter" (
    "id" SERIAL NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "equipmentParameterId" INTEGER NOT NULL,
    "targetValue" VARCHAR(255) NOT NULL,

    CONSTRAINT "PhaseEquipmentParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "GroupType" NOT NULL,
    "targetExecutionTime" BIGINT NOT NULL,
    "baseQuantity" DECIMAL(10,2) NOT NULL,
    "uom" VARCHAR(20) NOT NULL,
    "procedureLogic" JSON,
    "isbuildingBlock" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupPhase" (
    "groupId" VARCHAR(50) NOT NULL,
    "phaseId" INTEGER NOT NULL,

    CONSTRAINT "GroupPhase_pkey" PRIMARY KEY ("groupId","phaseId")
);

-- CreateTable
CREATE TABLE "EmbededGroup" (
    "parentGroupId" VARCHAR(50) NOT NULL,
    "childGroupId" VARCHAR(50) NOT NULL,

    CONSTRAINT "EmbededGroup_pkey" PRIMARY KEY ("parentGroupId","childGroupId")
);

-- CreateTable
CREATE TABLE "BatchExecution" (
    "id" SERIAL NOT NULL,
    "batchId" VARCHAR(50) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "BatchExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchPhaseExecution" (
    "id" SERIAL NOT NULL,
    "batchExecutionId" INTEGER NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "executionTime" BIGINT NOT NULL,

    CONSTRAINT "BatchPhaseExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchGroupExecution" (
    "id" SERIAL NOT NULL,
    "batchExecutionId" INTEGER NOT NULL,
    "groupId" VARCHAR(50) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "executionTime" BIGINT NOT NULL,

    CONSTRAINT "BatchGroupExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchExecutionParameter" (
    "executionPhaseId" INTEGER NOT NULL,
    "phaseParameterId" INTEGER NOT NULL,
    "value" VARCHAR(255) NOT NULL,

    CONSTRAINT "BatchExecutionParameter_pkey" PRIMARY KEY ("executionPhaseId","phaseParameterId")
);

-- CreateTable
CREATE TABLE "BatchExecutionMaterial" (
    "executionPhaseId" INTEGER NOT NULL,
    "materialId" VARCHAR(50) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "uom" VARCHAR(20) NOT NULL,

    CONSTRAINT "BatchExecutionMaterial_pkey" PRIMARY KEY ("executionPhaseId","materialId")
);

-- AddForeignKey
ALTER TABLE "PhaseMaterial" ADD CONSTRAINT "PhaseMaterial_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseMaterial" ADD CONSTRAINT "PhaseMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_class_fkey" FOREIGN KEY ("class") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentParameter" ADD CONSTRAINT "EquipmentParameter_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseEquipment" ADD CONSTRAINT "PhaseEquipment_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseEquipment" ADD CONSTRAINT "PhaseEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseEquipmentParameter" ADD CONSTRAINT "PhaseEquipmentParameter_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseEquipmentParameter" ADD CONSTRAINT "PhaseEquipmentParameter_equipmentParameterId_fkey" FOREIGN KEY ("equipmentParameterId") REFERENCES "EquipmentParameter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPhase" ADD CONSTRAINT "GroupPhase_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPhase" ADD CONSTRAINT "GroupPhase_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbededGroup" ADD CONSTRAINT "EmbededGroup_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbededGroup" ADD CONSTRAINT "EmbededGroup_childGroupId_fkey" FOREIGN KEY ("childGroupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchPhaseExecution" ADD CONSTRAINT "BatchPhaseExecution_batchExecutionId_fkey" FOREIGN KEY ("batchExecutionId") REFERENCES "BatchExecution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchPhaseExecution" ADD CONSTRAINT "BatchPhaseExecution_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchGroupExecution" ADD CONSTRAINT "BatchGroupExecution_batchExecutionId_fkey" FOREIGN KEY ("batchExecutionId") REFERENCES "BatchExecution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchGroupExecution" ADD CONSTRAINT "BatchGroupExecution_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchExecutionParameter" ADD CONSTRAINT "BatchExecutionParameter_executionPhaseId_fkey" FOREIGN KEY ("executionPhaseId") REFERENCES "BatchPhaseExecution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchExecutionParameter" ADD CONSTRAINT "BatchExecutionParameter_phaseParameterId_fkey" FOREIGN KEY ("phaseParameterId") REFERENCES "PhaseEquipmentParameter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchExecutionMaterial" ADD CONSTRAINT "BatchExecutionMaterial_executionPhaseId_fkey" FOREIGN KEY ("executionPhaseId") REFERENCES "BatchPhaseExecution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchExecutionMaterial" ADD CONSTRAINT "BatchExecutionMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
